package com.rohanic.meshradar.playstore

import android.app.Activity
import android.content.Context
import android.content.pm.PackageInfo
import android.os.Build
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.android.play.core.review.ReviewManagerFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Google Play in-app updates (DEC-043) and in-app review (DEC-044). Shapes match
 * modules/play-store/index.ts. Only the flexible update flow is used: the immediate flow blocks
 * the whole app, and nothing may stand between a person and SOS. Every Play call fails softly
 * (offline, sideloaded, no Play Store), because none of this is in the safety path.
 */
class PlayStoreModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw CodedException("no_context", "React context is gone", null)

    private var updates: AppUpdateManager? = null

    private val listener = InstallStateUpdatedListener { state ->
        sendEvent(
            "updateState",
            mapOf(
                "status" to installStatus(state.installStatus()),
                "bytes" to state.bytesDownloaded().toDouble(),
                "total" to state.totalBytesToDownload().toDouble(),
                "error" to state.installErrorCode(),
            ),
        )
    }

    private fun manager(): AppUpdateManager =
        updates ?: AppUpdateManagerFactory.create(context).also {
            it.registerListener(listener)
            updates = it
        }

    private val flexible: AppUpdateOptions get() = AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()

    override fun definition() = ModuleDefinition {
        Name("PlayStore")

        Events("updateState")

        OnDestroy { updates?.unregisterListener(listener) }

        /** This build's version code, which the mesh announces to group members. */
        Function("versionCode") { versionCode(context.packageManager.getPackageInfo(context.packageName, 0)) }

        AsyncFunction("checkUpdate") { promise: Promise ->
            manager().appUpdateInfo
                .addOnSuccessListener { info -> promise.resolve(infoMap(info)) }
                .addOnFailureListener { promise.resolve(UNKNOWN_INFO) }
        }

        /** Shows Play's flexible update dialog; resolves true when the person accepts. */
        AsyncFunction("startUpdate") { promise: Promise ->
            val activity = appContext.currentActivity
            if (activity == null) {
                promise.resolve(false)
                return@AsyncFunction
            }
            val m = manager()
            m.appUpdateInfo
                .addOnSuccessListener { info ->
                    if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE || !info.isUpdateTypeAllowed(flexible)) {
                        promise.resolve(false)
                    } else {
                        m.startUpdateFlow(info, activity, flexible)
                            .addOnSuccessListener { result -> promise.resolve(result == Activity.RESULT_OK) }
                            .addOnFailureListener { promise.resolve(false) }
                    }
                }
                .addOnFailureListener { promise.resolve(false) }
        }

        /** Installs a downloaded update. The app restarts, so call it only after the person taps Restart. */
        AsyncFunction("completeUpdate") { promise: Promise ->
            manager().completeUpdate()
                .addOnSuccessListener { promise.resolve(null) }
                .addOnFailureListener { e -> promise.reject(CodedException("update_failed", e.message, e)) }
        }

        /** Play decides whether its rating dialog actually shows; the result only says the flow ran. */
        AsyncFunction("requestReview") { promise: Promise ->
            val activity = appContext.currentActivity
            if (activity == null) {
                promise.resolve(false)
                return@AsyncFunction
            }
            val reviews = ReviewManagerFactory.create(context)
            reviews.requestReviewFlow()
                .addOnSuccessListener { info ->
                    reviews.launchReviewFlow(activity, info).addOnCompleteListener { promise.resolve(true) }
                }
                .addOnFailureListener { promise.resolve(false) }
        }
    }

    @Suppress("DEPRECATION")
    private fun versionCode(info: PackageInfo): Double =
        if (Build.VERSION.SDK_INT >= 28) info.longVersionCode.toDouble() else info.versionCode.toDouble()

    private fun infoMap(info: AppUpdateInfo): Map<String, Any?> = mapOf(
        "availability" to when (info.updateAvailability()) {
            UpdateAvailability.UPDATE_AVAILABLE -> "available"
            UpdateAvailability.UPDATE_NOT_AVAILABLE -> "none"
            UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> "inProgress"
            else -> "unknown"
        },
        "versionCode" to info.availableVersionCode(),
        "stalenessDays" to info.clientVersionStalenessDays(),
        "priority" to info.updatePriority(),
        "flexibleAllowed" to info.isUpdateTypeAllowed(flexible),
        "installStatus" to installStatus(info.installStatus()),
    )

    private fun installStatus(status: Int): String = when (status) {
        InstallStatus.PENDING -> "pending"
        InstallStatus.DOWNLOADING -> "downloading"
        InstallStatus.DOWNLOADED -> "downloaded"
        InstallStatus.INSTALLING -> "installing"
        InstallStatus.INSTALLED -> "installed"
        InstallStatus.FAILED -> "failed"
        InstallStatus.CANCELED -> "canceled"
        else -> "unknown"
    }

    companion object {
        private val UNKNOWN_INFO = mapOf(
            "availability" to "unknown",
            "versionCode" to 0,
            "stalenessDays" to null,
            "priority" to 0,
            "flexibleAllowed" to false,
            "installStatus" to "unknown",
        )
    }
}
