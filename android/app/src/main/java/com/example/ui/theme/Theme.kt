package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = BrandTealLight,
    onPrimary = Color.Black,
    primaryContainer = BrandNavyDark,
    onPrimaryContainer = Color.White,
    secondary = BrandGoldLight,
    onSecondary = Color.Black,
    tertiary = BrandTeal,
    background = NeutralDarkBg,
    onBackground = Color(0xFFF1F5F9),
    surface = NeutralDarkSurface,
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = NeutralDarkCard,
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = Color(0xFF475569)
  )

private val LightColorScheme =
  lightColorScheme(
    primary = BrandNavy,
    onPrimary = Color.White,
    primaryContainer = BrandNavyLight,
    onPrimaryContainer = Color.White,
    secondary = BrandTeal,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE0F2F1),
    onSecondaryContainer = BrandTealDark,
    tertiary = BrandGold,
    onTertiary = Color.White,
    background = NeutralLightBg,
    onBackground = Color(0xFF0F172A),
    surface = NeutralLightSurface,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = NeutralLightCard,
    onSurfaceVariant = Color(0xFF475569),
    outline = Color(0xFFE2E8F0)
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }
      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}

