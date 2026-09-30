package com.example.data.remote

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * Downloads a listing's video once and plays it from disk.
 *
 * The platform MediaPlayer has its own HTTP stack, and it is a poor one: on the
 * emulator and on several real devices it stalls for six seconds per read
 * against Supabase storage and eventually gives up with error (1, -2147483648).
 * OkHttp -- already in the app for every other request -- fetches the same file
 * without trouble, so the video is pulled to the cache directory first and
 * VideoView is handed a local path.
 *
 * Videos are capped at 20MB by the backend, so a whole file is a reasonable
 * thing to hold. Caching also means scrolling back up the feed, or reopening a
 * listing, costs nothing: the second play is instant and free.
 */
object VideoCache {

    // Generous timeouts: this is a whole file over a connection that may be 2G,
    // and the default ten seconds would abandon a video that was arriving fine.
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        // A 20MB clip over a 2G uplink is minutes, not seconds, and a stalled
        // read is normal on a mobile network. Giving up early would mean no
        // video at all for exactly the buyers this marketplace is built for.
        .readTimeout(2, TimeUnit.MINUTES)
        .callTimeout(10, TimeUnit.MINUTES)
        .retryOnConnectionFailure(true)
        .build()

    /** Roughly ten short clips. Old files are dropped oldest-first. */
    private const val MAX_CACHE_BYTES = 200L * 1024 * 1024

    suspend fun localFile(context: Context, url: String): File? = withContext(Dispatchers.IO) {
        val directory = File(context.cacheDir, "listing-videos").apply { mkdirs() }
        val target = File(directory, fileNameFor(url))

        if (target.exists() && target.length() > 0) {
            // Touch it so the eviction below treats it as recently used.
            target.setLastModified(System.currentTimeMillis())
            return@withContext target
        }

        val partial = File(directory, target.name + ".part")
        // One retry: a dropped connection mid-file is common enough here that
        // failing on the first attempt would look like a broken feature.
        var result = download(url, partial, target)
        if (result == null) result = download(url, partial, target)

        partial.delete()
        trim(directory)
        result
    }

    private fun download(url: String, partial: File, target: File): File? {
        return runCatching {
            client.newCall(Request.Builder().url(url).build()).execute().use { response ->
                if (!response.isSuccessful) return@use null
                val body = response.body ?: return@use null
                partial.outputStream().use { output -> body.byteStream().copyTo(output) }
                // Rename only once the file is whole: a half-written video that
                // survives a dropped connection would play as a broken one
                // forever after.
                if (partial.renameTo(target)) target else null
            }
        }.onFailure { error ->
            Log.w("VideoCache", "Could not download " + url + " :: " + error)
        }.getOrNull()
    }

    private fun fileNameFor(url: String): String {
        val extension = url.substringAfterLast('.', "mp4").take(4)
        return url.hashCode().toUInt().toString(16) + "." + extension
    }

    private fun trim(directory: File) {
        val files = directory.listFiles()?.sortedBy { it.lastModified() } ?: return
        var total = files.sumOf { it.length() }
        for (file in files) {
            if (total <= MAX_CACHE_BYTES) return
            total -= file.length()
            file.delete()
        }
    }
}
