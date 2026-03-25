package com.cinesync.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Main Application class for CineSync.
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection.
 */
@HiltAndroidApp
class MainApplication : Application()
