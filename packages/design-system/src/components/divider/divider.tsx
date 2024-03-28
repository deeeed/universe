import React from "react"
import { View, StyleSheet } from "react-native"

const Divider = () => <View style={styles.container} />

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    // backgroundColor: Colors.background,
  },
})

export { Divider }
