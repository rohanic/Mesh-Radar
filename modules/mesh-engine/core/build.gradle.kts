import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.2.0"
}

repositories {
    mavenCentral()
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_21) }
}

dependencies {
    // Same libsodium binding as the Android build (lazysodium-android), JVM flavour for tests (DEC-004).
    // lazysodium 5.2.0 ships Java 21 bytecode, so this project targets 21.
    implementation("com.goterl:lazysodium-java:5.2.0")
    implementation("net.java.dev.jna:jna:5.17.0")
    // Android ships org.json in the platform; the JVM build needs the library.
    implementation("org.json:json:20250517")
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
    maxHeapSize = "1g"
    testLogging {
        events("failed")
        showStandardStreams = true
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
