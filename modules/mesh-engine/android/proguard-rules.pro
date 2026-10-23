# Applied to the app's R8 pass (consumerProguardFiles). Release builds minify
# (app.config.ts, enableMinifyInReleaseBuilds) and neither JNA nor lazysodium-android
# ships its own rules (DEC-041).

# JNA, from its FAQ ("JNA on Android"). Its native dispatcher finds Java classes, fields
# and methods by name, so renaming or stripping them breaks every libsodium call.
-dontwarn java.awt.*
-keep class com.sun.jna.* { *; }
-keep class * extends com.sun.jna.* { *; }
-keepclassmembers class * extends com.sun.jna.* { public *; }

# lazysodium binds its native methods and JNA structures through JNA (DEC-009).
-keep class com.goterl.lazysodium.** { *; }
