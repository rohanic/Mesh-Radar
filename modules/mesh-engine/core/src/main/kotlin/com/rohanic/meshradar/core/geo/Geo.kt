package com.rohanic.meshradar.core.geo

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/** Geodesy helpers shared by safety features that must run with the UI closed (E1, E9, E7). */
object Geo {
    private const val EARTH_RADIUS_M = 6_371_008.8

    fun distanceM(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val p1 = Math.toRadians(lat1)
        val p2 = Math.toRadians(lat2)
        val dp = Math.toRadians(lat2 - lat1)
        val dl = Math.toRadians(lon2 - lon1)
        val a = sin(dp / 2).pow(2) + cos(p1) * cos(p2) * sin(dl / 2).pow(2)
        return 2 * EARTH_RADIUS_M * atan2(sqrt(a), sqrt(1 - a))
    }

    /** Initial bearing from point 1 to point 2, degrees clockwise from true north (0..360). */
    fun bearingDeg(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val p1 = Math.toRadians(lat1)
        val p2 = Math.toRadians(lat2)
        val dl = Math.toRadians(lon2 - lon1)
        val y = sin(dl) * cos(p2)
        val x = cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dl)
        return (Math.toDegrees(atan2(y, x)) + 360) % 360
    }

    /**
     * Snap to a grid of about [cellM] metres so strangers learn only a rough area (privacy
     * commitment 5). Returns the cell centre.
     */
    fun coarse(lat: Double, lon: Double, cellM: Double = PUBLIC_CELL_M): Pair<Double, Double> {
        val latStep = cellM / 111_320.0
        val lonStep = cellM / (111_320.0 * cos(Math.toRadians(lat)).coerceAtLeast(0.01))
        val cLat = (floor(lat / latStep) + 0.5) * latStep
        val cLon = (floor(lon / lonStep) + 0.5) * lonStep
        return cLat.coerceIn(-90.0, 90.0) to cLon.coerceIn(-180.0, 180.0)
    }

    /** Eight-point compass label for coarse directions. */
    fun compass8(bearing: Double): String {
        val names = arrayOf("N", "NE", "E", "SE", "S", "SW", "W", "NW")
        return names[(((bearing % 360) + 360) % 360 / 45.0 + 0.5).toInt() % 8]
    }

    /** Altitude difference in metres between two barometric readings (hypsometric approximation). */
    fun pressureAltitudeDiffM(pressurePa: Double, referencePa: Double): Double =
        44_330.0 * (1 - (pressurePa / referencePa).pow(1 / 5.255))

    const val PUBLIC_CELL_M = 150.0
}
