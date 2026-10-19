package com.rohanic.meshradar.engine

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertisingSet
import android.bluetooth.le.AdvertisingSetCallback
import android.bluetooth.le.AdvertisingSetParameters
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.ParcelUuid
import android.util.Log
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Transport 2 (section 8): connectionless BLE extended advertising carrying our latest sealed
 * position, SOS or Last-Crumb packet (DEC-008). Phones in range hear it without a connection and
 * feed it into the mesh. Phones without LE extended advertising skip this transport.
 */
@SuppressLint("MissingPermission")
class BleBeacons(
    private val context: Context,
    private val handler: Handler,
    private val onBeacon: (ByteArray) -> Unit,
) {
    private val adapter: BluetoothAdapter? = context.getSystemService(BluetoothManager::class.java)?.adapter
    private var set: AdvertisingSet? = null
    private var scanning = false
    private var advertisingStarted = false
    private var current: ByteArray? = null
    private var rotateIndex = 0
    /** Distinct beacon sources seen recently, by address (addresses rotate; this is an estimate). */
    private val seen = ConcurrentHashMap<String, Long>()

    val supported: Boolean
        get() = adapter != null && adapter.isLeExtendedAdvertisingSupported

    fun density(nowMs: Long): Int = seen.values.count { nowMs - it < 60_000 }

    fun start(scanMode: Int) {
        if (!supported) return
        startScan(scanMode)
    }

    fun stop() {
        try {
            adapter?.bluetoothLeAdvertiser?.stopAdvertisingSet(advertiseCallback)
            if (scanning) adapter?.bluetoothLeScanner?.stopScan(scanCallback)
        } catch (e: SecurityException) {
            Log.w(TAG, "stop without permission", e)
        } catch (e: IllegalStateException) {
            Log.w(TAG, "bluetooth off", e)
        }
        set = null
        advertisingStarted = false
        scanning = false
        current = null
    }

    fun setScanMode(scanMode: Int) {
        if (!supported) return
        if (scanning) {
            try {
                adapter?.bluetoothLeScanner?.stopScan(scanCallback)
            } catch (e: Exception) {
                Log.w(TAG, "stopScan", e)
            }
            scanning = false
        }
        startScan(scanMode)
    }

    /** Rotate through the packets the core wants on air: SOS, Last-Crumb, then position. */
    fun update(packets: List<ByteArray>) {
        if (!supported || packets.isEmpty()) return
        val next = packets[rotateIndex % packets.size]
        rotateIndex++
        if (next.contentEquals(current)) return
        if (next.size + 18 > maxData()) return
        current = next
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceData(SERVICE_UUID, next)
            .build()
        try {
            val s = set
            if (s != null) {
                s.setAdvertisingData(data)
            } else if (!advertisingStarted) {
                advertisingStarted = true
                val params = AdvertisingSetParameters.Builder()
                    .setLegacyMode(false)
                    .setConnectable(false)
                    .setScannable(false)
                    .setInterval(AdvertisingSetParameters.INTERVAL_MEDIUM)
                    .setTxPowerLevel(AdvertisingSetParameters.TX_POWER_MEDIUM)
                    .setPrimaryPhy(BluetoothDevice.PHY_LE_1M)
                    .setSecondaryPhy(BluetoothDevice.PHY_LE_1M)
                    .build()
                adapter?.bluetoothLeAdvertiser?.startAdvertisingSet(params, data, null, null, null, advertiseCallback)
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "advertise without permission", e)
            advertisingStarted = false
        } catch (e: IllegalStateException) {
            Log.w(TAG, "bluetooth off", e)
            advertisingStarted = false
        }
    }

    private fun maxData(): Int = try {
        adapter?.leMaximumAdvertisingDataLength ?: 31
    } catch (e: Exception) {
        31
    }

    private fun startScan(scanMode: Int) {
        val scanner = adapter?.bluetoothLeScanner ?: return
        // Match our service data whose first byte is protocol version 1 (needed for screen-off scans).
        val filter = ScanFilter.Builder()
            .setServiceData(SERVICE_UUID, byteArrayOf(1), byteArrayOf(0xFF.toByte()))
            .build()
        val settings = ScanSettings.Builder()
            .setScanMode(scanMode)
            .setLegacy(false)
            .setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED)
            .build()
        try {
            scanner.startScan(listOf(filter), settings, scanCallback)
            scanning = true
        } catch (e: SecurityException) {
            Log.w(TAG, "scan without permission", e)
        } catch (e: IllegalStateException) {
            Log.w(TAG, "bluetooth off", e)
        }
    }

    private val advertiseCallback = object : AdvertisingSetCallback() {
        override fun onAdvertisingSetStarted(advertisingSet: AdvertisingSet?, txPower: Int, status: Int) {
            if (status == ADVERTISE_SUCCESS) set = advertisingSet else advertisingStarted = false
        }

        override fun onAdvertisingSetStopped(advertisingSet: AdvertisingSet?) {
            set = null
            advertisingStarted = false
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val data = result.scanRecord?.getServiceData(SERVICE_UUID) ?: return
            seen[result.device.address] = System.currentTimeMillis()
            handler.post { onBeacon(data) }
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>) {
            results.forEach { onScanResult(0, it) }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.w(TAG, "scan failed $errorCode")
            scanning = false
        }
    }

    companion object {
        private const val TAG = "MeshBle"
        /** Random 128-bit UUID for Mesh Radar beacons (no Bluetooth SIG 16-bit UUID needed). */
        val SERVICE_UUID: ParcelUuid = ParcelUuid(UUID.fromString("6b7d2f3e-8c1a-4b5e-9a2d-1f0e3c4b5a69"))
    }
}
