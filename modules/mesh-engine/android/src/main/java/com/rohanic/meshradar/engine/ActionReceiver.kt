package com.rohanic.meshradar.engine

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Persistent-notification actions: "I'm OK" to every group, and Stop. */
class ActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Engine.init(context)
        when (intent.action) {
            ACTION_OK -> Engine.handler.post { Engine.core.quickReplyAll(QUICK_IM_OK) }
            ACTION_STOP -> context.stopService(Intent(context, MeshService::class.java))
        }
    }

    companion object {
        const val ACTION_OK = "com.rohanic.meshradar.action.OK"
        const val ACTION_STOP = "com.rohanic.meshradar.action.STOP"
        /** Must match QUICK_REPLIES in src/core/engine/quickReplies.ts. */
        const val QUICK_IM_OK = 1
    }
}
