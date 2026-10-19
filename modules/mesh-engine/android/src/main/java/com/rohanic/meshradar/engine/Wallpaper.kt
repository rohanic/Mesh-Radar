package com.rohanic.meshradar.engine

import android.app.WallpaperManager
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri

/** Lost-child card as lock-screen wallpaper (E6). The image is rendered in JS. */
object Wallpaper {
    fun setLockScreen(context: Context, uri: String): Boolean {
        val bitmap = context.contentResolver.openInputStream(Uri.parse(uri))?.use { BitmapFactory.decodeStream(it) } ?: return false
        val wm = WallpaperManager.getInstance(context)
        if (!wm.isWallpaperSupported || !wm.isSetWallpaperAllowed) return false
        wm.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
        return true
    }
}
