When using a non default port with custom dev server, it sometimes fails to pickup the correct port from the command line or when launching directly from xcode or android studio.

In that case you need to manually edit these files:

### android

DEFAULT_DEV_SERVER_PORT
examples/designdemo/node_modules/@react-native/gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt


### ios

You will also need to update your applications to load the JavaScript bundle from the new port. If running on device from Xcode, you can do this by updating occurrences of 8081 to your chosen port in the ios/__App_Name__.xcodeproj/project.pbxproj file.

## Remidner

anytime you run `expo prebuild --clean` you will need to manually edit these files again.
