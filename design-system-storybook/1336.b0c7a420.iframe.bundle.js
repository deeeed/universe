(self.webpackChunk_siteed_design_system=self.webpackChunk_siteed_design_system||[]).push([[1336],{"./src/components/Skeleton/LoadingPulseBar/LoadingPulseBar.tsx":(__unused_webpack_module,exports,__webpack_require__)=>{var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.LoadingPulseBar=void 0;var _react=_interopRequireWildcard(__webpack_require__("./node_modules/react/index.js")),_StyleSheet=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/StyleSheet/index.js")),_reactNativeReanimated=_interopRequireWildcard(__webpack_require__("./node_modules/react-native-reanimated/lib/module/index.web.js")),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}var _worklet_8964404333244_init_data={code:"function anonymous(){const{opacity}=this.__closure;return{opacity:opacity.value};}"},LoadingPulseBar=exports.LoadingPulseBar=function LoadingPulseBar(_ref2){var style=_ref2.style,_ref2$height=_ref2.height,height=void 0===_ref2$height?20:_ref2$height,_ref2$color=_ref2.color,color=void 0===_ref2$color?"#ccc":_ref2$color,_ref2$width=_ref2.width,width=void 0===_ref2$width?"100%":_ref2$width,_ref2$animationDurati=_ref2.animationDuration,animationDuration=void 0===_ref2$animationDurati?1e3:_ref2$animationDurati,_ref2$minOpacity=_ref2.minOpacity,minOpacity=void 0===_ref2$minOpacity?.5:_ref2$minOpacity,_ref2$maxOpacity=_ref2.maxOpacity,maxOpacity=void 0===_ref2$maxOpacity?1:_ref2$maxOpacity,styles=(0,_react.useMemo)((function(){return function getStyles(_ref){var height=_ref.height,color=_ref.color,width=_ref.width;return _StyleSheet.default.create({pulseBar:{height,backgroundColor:color,borderRadius:5,width}})}({color,width,height})}),[color,width,height]),opacity=(0,_reactNativeReanimated.useSharedValue)(minOpacity);opacity.value=(0,_reactNativeReanimated.withRepeat)((0,_reactNativeReanimated.withTiming)(maxOpacity,{duration:animationDuration}),-1,!0);var anonymous,animatedStyles=(0,_reactNativeReanimated.useAnimatedStyle)(((anonymous=function anonymous(){return{opacity:opacity.value}}).__closure={opacity},anonymous.__workletHash=8964404333244,anonymous.__initData=_worklet_8964404333244_init_data,anonymous));return(0,_jsxRuntime.jsx)(_reactNativeReanimated.default.View,{style:[styles.pulseBar,animatedStyles,style]})};try{LoadingPulseBar.displayName="LoadingPulseBar",LoadingPulseBar.__docgenInfo={description:"",displayName:"LoadingPulseBar",props:{style:{defaultValue:null,description:"",name:"style",required:!1,type:{name:"StyleProp<ViewStyle>"}},height:{defaultValue:{value:"20"},description:"",name:"height",required:!1,type:{name:"number"}},color:{defaultValue:{value:"#ccc"},description:"",name:"color",required:!1,type:{name:"string"}},width:{defaultValue:{value:"100%"},description:"",name:"width",required:!1,type:{name:"DimensionValue"}},animationDuration:{defaultValue:{value:"1000"},description:"",name:"animationDuration",required:!1,type:{name:"number"}},minOpacity:{defaultValue:{value:"0.5"},description:"",name:"minOpacity",required:!1,type:{name:"number"}},maxOpacity:{defaultValue:{value:"1"},description:"",name:"maxOpacity",required:!1,type:{name:"number"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/Skeleton/LoadingPulseBar/LoadingPulseBar.tsx#LoadingPulseBar"]={docgenInfo:LoadingPulseBar.__docgenInfo,name:"LoadingPulseBar",path:"src/components/Skeleton/LoadingPulseBar/LoadingPulseBar.tsx#LoadingPulseBar"})}catch(__react_docgen_typescript_loader_error){}}}]);