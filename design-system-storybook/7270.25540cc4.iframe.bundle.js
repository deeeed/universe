(self.webpackChunk_siteed_design_system=self.webpackChunk_siteed_design_system||[]).push([[7270],{"./node_modules/@react-native-community/slider/dist/RNCSliderNativeComponent.web.js":function(__unused_webpack_module,exports,__webpack_require__){var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var _toConsumableArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/toConsumableArray.js")),_slicedToArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/slicedToArray.js")),_objectWithoutProperties2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/objectWithoutProperties.js")),_reactDom=_interopRequireDefault(__webpack_require__("./node_modules/react-dom/index.js")),_react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js"),_excluded=["value","minimumValue","maximumValue","lowerLimit","upperLimit","step","minimumTrackTintColor","maximumTrackTintColor","thumbTintColor","thumbStyle","style","inverted","disabled","trackHeight","thumbSize","thumbImage","onRNCSliderSlidingStart","onRNCSliderSlidingComplete","onRNCSliderValueChange"];function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var valueToEvent=function valueToEvent(value){return{nativeEvent:{value}}},RCTSliderWebComponent=_react.default.forwardRef((function(_ref,forwardedRef){var _ref$value=_ref.value,initialValue=void 0===_ref$value?0:_ref$value,_ref$minimumValue=_ref.minimumValue,minimumValue=void 0===_ref$minimumValue?0:_ref$minimumValue,_ref$maximumValue=_ref.maximumValue,maximumValue=void 0===_ref$maximumValue?0:_ref$maximumValue,_ref$lowerLimit=_ref.lowerLimit,lowerLimit=void 0===_ref$lowerLimit?0:_ref$lowerLimit,_ref$upperLimit=_ref.upperLimit,upperLimit=void 0===_ref$upperLimit?0:_ref$upperLimit,_ref$step=_ref.step,step=void 0===_ref$step?1:_ref$step,_ref$minimumTrackTint=_ref.minimumTrackTintColor,minimumTrackTintColor=void 0===_ref$minimumTrackTint?"#009688":_ref$minimumTrackTint,_ref$maximumTrackTint=_ref.maximumTrackTintColor,maximumTrackTintColor=void 0===_ref$maximumTrackTint?"#939393":_ref$maximumTrackTint,_ref$thumbTintColor=_ref.thumbTintColor,thumbTintColor=void 0===_ref$thumbTintColor?"#009688":_ref$thumbTintColor,_ref$thumbStyle=_ref.thumbStyle,thumbStyle=void 0===_ref$thumbStyle?{}:_ref$thumbStyle,_ref$style=_ref.style,style=void 0===_ref$style?{}:_ref$style,_ref$inverted=_ref.inverted,inverted=void 0!==_ref$inverted&&_ref$inverted,_ref$disabled=_ref.disabled,disabled=void 0!==_ref$disabled&&_ref$disabled,_ref$trackHeight=_ref.trackHeight,trackHeight=void 0===_ref$trackHeight?4:_ref$trackHeight,_ref$thumbSize=_ref.thumbSize,thumbSize=void 0===_ref$thumbSize?20:_ref$thumbSize,thumbImage=_ref.thumbImage,_ref$onRNCSliderSlidi=_ref.onRNCSliderSlidingStart,onRNCSliderSlidingStart=void 0===_ref$onRNCSliderSlidi?function(_){}:_ref$onRNCSliderSlidi,_ref$onRNCSliderSlidi2=_ref.onRNCSliderSlidingComplete,onRNCSliderSlidingComplete=void 0===_ref$onRNCSliderSlidi2?function(_){}:_ref$onRNCSliderSlidi2,_ref$onRNCSliderValue=_ref.onRNCSliderValueChange,onRNCSliderValueChange=void 0===_ref$onRNCSliderValue?function(_){}:_ref$onRNCSliderValue,others=(0,_objectWithoutProperties2.default)(_ref,_excluded),containerSize=_react.default.useRef({width:0,height:0}),containerPositionX=_react.default.useRef(0),containerRef=forwardedRef||_react.default.createRef(),containerPositionInvalidated=_react.default.useRef(!1),_React$useState=_react.default.useState(initialValue||minimumValue),_React$useState2=(0,_slicedToArray2.default)(_React$useState,2),value=_React$useState2[0],setValue=_React$useState2[1],lastInitialValue=_react.default.useRef(),animationValues=_react.default.useRef({val:new _reactNative.Animated.Value(value),min:new _reactNative.Animated.Value(minimumValue),max:new _reactNative.Animated.Value(maximumValue),diff:new _reactNative.Animated.Value(maximumValue-minimumValue||1)}).current;_react.default.useEffect((function(){animationValues.min.setValue(minimumValue),animationValues.max.setValue(maximumValue),animationValues.diff.setValue(maximumValue-minimumValue||1)}),[animationValues,minimumValue,maximumValue]);var minPercent=_react.default.useRef(_reactNative.Animated.multiply(new _reactNative.Animated.Value(100),_reactNative.Animated.divide(_reactNative.Animated.subtract(animationValues.val,animationValues.min),animationValues.diff))).current,maxPercent=_react.default.useRef(_reactNative.Animated.subtract(new _reactNative.Animated.Value(100),minPercent)).current,onValueChange=(0,_react.useCallback)((function(value){onRNCSliderValueChange&&onRNCSliderValueChange(valueToEvent(value))}),[onRNCSliderValueChange]),onSlidingStart=(0,_react.useCallback)((function(value){isUserInteracting.current=!0,onRNCSliderSlidingStart&&onRNCSliderSlidingStart(valueToEvent(value))}),[onRNCSliderSlidingStart]),onSlidingComplete=(0,_react.useCallback)((function(value){isUserInteracting.current=!1,onRNCSliderSlidingComplete&&onRNCSliderSlidingComplete(valueToEvent(value))}),[onRNCSliderSlidingComplete]),isUserInteracting=_react.default.useRef(!1),_updateValue=(0,_react.useCallback)((function(newValue){var hardRounded=decimalPrecision.current<20?Number.parseFloat(newValue.toFixed(decimalPrecision.current)):newValue,withinBounds=Math.max(minimumValue,Math.min(hardRounded,maximumValue));return value!==withinBounds?(setValue(withinBounds),isUserInteracting.current&&onValueChange(withinBounds),withinBounds):hardRounded}),[minimumValue,maximumValue,value,onValueChange]);_react.default.useLayoutEffect((function(){if(initialValue!==lastInitialValue.current){lastInitialValue.current=initialValue;var newValue=_updateValue(initialValue);animationValues.val.setValue(newValue)}}),[initialValue,_updateValue,animationValues]),_react.default.useEffect((function(){var invalidateContainerPosition=function invalidateContainerPosition(){containerPositionInvalidated.current=!0},onDocumentScroll=function onDocumentScroll(e){!containerPositionInvalidated.current&&containerRef.current&&e.target.contains(containerRef.current)&&invalidateContainerPosition()};return window.addEventListener("resize",invalidateContainerPosition),document.addEventListener("scroll",onDocumentScroll,{capture:!0}),function(){window.removeEventListener("resize",invalidateContainerPosition),document.removeEventListener("scroll",onDocumentScroll,{capture:!0})}}),[containerRef]);var containerStyle=[{flexGrow:1,flexShrink:1,flexBasis:"auto",flexDirection:"row",alignItems:"center"},style],trackStyle={height:trackHeight,borderRadius:trackHeight/2,userSelect:"none"},minimumTrackStyle=Object.assign({},trackStyle,{backgroundColor:minimumTrackTintColor,flexGrow:minPercent}),maximumTrackStyle=Object.assign({},trackStyle,{backgroundColor:maximumTrackTintColor,flexGrow:maxPercent}),thumbViewStyle=[{width:thumbSize,height:thumbSize,backgroundColor:thumbTintColor,zIndex:1,borderRadius:thumbSize/2,overflow:"hidden"},thumbStyle],decimalPrecision=_react.default.useRef(calculatePrecision(minimumValue,maximumValue,step));_react.default.useEffect((function(){decimalPrecision.current=calculatePrecision(minimumValue,maximumValue,step)}),[maximumValue,minimumValue,step]);var updateContainerPositionX=function updateContainerPositionX(){var _ReactDOM$findDOMNode,positionX=null==(_ReactDOM$findDOMNode=_reactDom.default.findDOMNode(containerRef.current).getBoundingClientRect())?void 0:_ReactDOM$findDOMNode.x;containerPositionX.current=null!=positionX?positionX:0},getValueFromNativeEvent=function getValueFromNativeEvent(pageX){var adjustForThumbSize=(containerSize.current.width||1)>thumbSize,width=(containerSize.current.width||1)-(adjustForThumbSize?thumbSize:0);containerPositionInvalidated.current&&(containerPositionInvalidated.current=!1,updateContainerPositionX());var containerX=containerPositionX.current+(adjustForThumbSize?thumbSize/2:0),lowerValue=minimumValue<lowerLimit?lowerLimit:minimumValue,upperValue=maximumValue>upperLimit?upperLimit:maximumValue;if(pageX<containerX)return inverted?upperValue:lowerValue;if(pageX>containerX+width)return inverted?lowerValue:upperValue;var x=pageX-containerX,newValue=inverted?maximumValue-(maximumValue-minimumValue)*x/width:minimumValue+(maximumValue-minimumValue)*x/width,valueAfterStep=step?Math.round(newValue/step)*step:newValue,valueAfterLowerLimit=valueAfterStep<lowerLimit?lowerLimit:valueAfterStep;return valueAfterLowerLimit>upperLimit?upperLimit:valueAfterLowerLimit};return _react.default.useImperativeHandle(forwardedRef,(function(){return{updateValue:function updateValue(val){_updateValue(val)}}}),[_updateValue]),(0,_jsxRuntime.jsxs)(_reactNative.View,Object.assign({ref:containerRef,onLayout:function onLayout(_ref4){var layout=_ref4.nativeEvent.layout;containerSize.current.height=layout.height,containerSize.current.width=layout.width,containerRef.current&&updateContainerPositionX()},accessibilityActions:[{name:"increment",label:"increment"},{name:"decrement",label:"decrement"}],onAccessibilityAction:function accessibilityActions(event){var tenth=(maximumValue-minimumValue)/10;switch(event.nativeEvent.actionName){case"increment":_updateValue(value+(step||tenth));break;case"decrement":_updateValue(value-(step||tenth))}},accessible:!0,accessibilityRole:"adjustable",style:containerStyle},others,{onStartShouldSetResponder:function onStartShouldSetResponder(){return!disabled},onMoveShouldSetResponder:function onMoveShouldSetResponder(){return!disabled},onResponderGrant:function onResponderGrant(){return onSlidingStart(value)},onResponderRelease:function onTouchEnd(_ref2){var nativeEvent=_ref2.nativeEvent,newValue=_updateValue(getValueFromNativeEvent(nativeEvent.pageX));animationValues.val.setValue(newValue),onSlidingComplete(newValue)},onResponderMove:function onMove(_ref3){var nativeEvent=_ref3.nativeEvent,newValue=getValueFromNativeEvent(nativeEvent.pageX);animationValues.val.setValue(newValue),_updateValue(newValue)},children:[(0,_jsxRuntime.jsx)(_reactNative.Animated.View,{pointerEvents:"none",style:minimumTrackStyle}),(0,_jsxRuntime.jsx)(_reactNative.View,{pointerEvents:"none",style:thumbViewStyle,children:void 0!==thumbImage?(0,_jsxRuntime.jsx)(_reactNative.Image,{source:thumbImage,style:{width:"100%",height:"100%"}}):null}),(0,_jsxRuntime.jsx)(_reactNative.Animated.View,{pointerEvents:"none",style:maximumTrackStyle})]}))}));function calculatePrecision(minimumValue,maximumValue,step){if(step){var decimals=[minimumValue,maximumValue,step].map((function(value){return((value+"").split(".").pop()||"").length}));return Math.max.apply(Math,(0,_toConsumableArray2.default)(decimals))}return 1/0}RCTSliderWebComponent.displayName="RTCSliderWebComponent";exports.default=RCTSliderWebComponent},"./node_modules/@react-native-community/slider/dist/Slider.js":function(__unused_webpack_module,exports,__webpack_require__){var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/slicedToArray.js")),_objectWithoutProperties2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/objectWithoutProperties.js")),_react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js"),_index=_interopRequireDefault(__webpack_require__("./node_modules/@react-native-community/slider/dist/index.js")),_StepsIndicator=__webpack_require__("./node_modules/@react-native-community/slider/dist/components/StepsIndicator.js"),_styles=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/styles.js"),_constants=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/constants.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js"),_excluded=["onValueChange","onSlidingStart","onSlidingComplete","onAccessibilityAction"];function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var SliderWithRef=_react.default.forwardRef((function SliderComponent(props,forwardedRef){var _props$value,_props$accessibilityS,onValueChange=props.onValueChange,onSlidingStart=props.onSlidingStart,onSlidingComplete=props.onSlidingComplete,onAccessibilityAction=props.onAccessibilityAction,localProps=(0,_objectWithoutProperties2.default)(props,_excluded),_useState=(0,_react.useState)(null!=(_props$value=props.value)?_props$value:props.minimumValue),_useState2=(0,_slicedToArray2.default)(_useState,2),currentValue=_useState2[0],setCurrentValue=_useState2[1],_useState3=(0,_react.useState)(0),_useState4=(0,_slicedToArray2.default)(_useState3,2),width=_useState4[0],setWidth=_useState4[1],stepResolution=localProps.step?localProps.step:_constants.constants.DEFAULT_STEP_RESOLUTION,defaultStep=(localProps.maximumValue-localProps.minimumValue)/stepResolution,stepLength=localProps.step||defaultStep,options=Array.from({length:(localProps.step?defaultStep:stepResolution)+1},(function(_,index){return localProps.minimumValue+index*stepLength})),defaultStyle="ios"===_reactNative.Platform.OS?_styles.styles.defaultSlideriOS:_styles.styles.defaultSlider,sliderStyle={zIndex:1,width},style=[props.style,defaultStyle],onValueChangeEvent=function onValueChangeEvent(event){onValueChange&&onValueChange(event.nativeEvent.value),setCurrentValue(event.nativeEvent.value)},_disabled="boolean"==typeof props.disabled?props.disabled:!0===(null==(_props$accessibilityS=props.accessibilityState)?void 0:_props$accessibilityS.disabled),_accessibilityState="boolean"==typeof props.disabled?Object.assign({},props.accessibilityState,{disabled:props.disabled}):props.accessibilityState,onSlidingStartEvent=onSlidingStart?function(event){onSlidingStart(event.nativeEvent.value)}:null,onSlidingCompleteEvent=onSlidingComplete?function(event){onSlidingComplete(event.nativeEvent.value)}:null,onAccessibilityActionEvent=onAccessibilityAction?function(event){onAccessibilityAction(event)}:null,value=Number.isNaN(props.value)||!props.value?void 0:props.value,lowerLimit=localProps.lowerLimit||0===localProps.lowerLimit?localProps.lowerLimit:_reactNative.Platform.select({web:localProps.minimumValue,default:_constants.constants.LIMIT_MIN_VALUE}),upperLimit=localProps.upperLimit||0===localProps.upperLimit?localProps.upperLimit:_reactNative.Platform.select({web:localProps.maximumValue,default:_constants.constants.LIMIT_MAX_VALUE});return(0,_react.useEffect)((function(){lowerLimit>=upperLimit&&console.warn("Invalid configuration: lower limit is supposed to be smaller than upper limit")}),[lowerLimit,upperLimit]),(0,_jsxRuntime.jsxs)(_reactNative.View,{onLayout:function onLayout(event){setWidth(event.nativeEvent.layout.width)},style:[style,{justifyContent:"center"}],children:[props.StepMarker||props.renderStepNumber?(0,_jsxRuntime.jsx)(_StepsIndicator.StepsIndicator,{options,sliderWidth:width,currentValue,renderStepNumber:localProps.renderStepNumber,thumbImage:localProps.thumbImage,StepMarker:localProps.StepMarker,isLTR:localProps.inverted}):null,(0,_jsxRuntime.jsx)(_index.default,Object.assign({},localProps,{value,lowerLimit,upperLimit,accessibilityState:_accessibilityState,thumbImage:"web"===_reactNative.Platform.OS?props.thumbImage:props.StepMarker?void 0:_reactNative.Image.resolveAssetSource(props.thumbImage),ref:forwardedRef,style:[sliderStyle,defaultStyle,{alignContent:"center",alignItems:"center"}],onChange:onValueChangeEvent,onRNCSliderSlidingStart:onSlidingStartEvent,onRNCSliderSlidingComplete:onSlidingCompleteEvent,onRNCSliderValueChange:onValueChangeEvent,disabled:_disabled,onStartShouldSetResponder:function onStartShouldSetResponder(){return!0},onResponderTerminationRequest:function onResponderTerminationRequest(){return!1},onRNCSliderAccessibilityAction:onAccessibilityActionEvent,thumbTintColor:props.thumbImage&&props.StepMarker?"transparent":props.thumbTintColor}))]})}));SliderWithRef.defaultProps={value:0,minimumValue:0,maximumValue:1,step:0,inverted:!1,tapToSeek:!1,lowerLimit:_reactNative.Platform.select({web:void 0,default:_constants.constants.LIMIT_MIN_VALUE}),upperLimit:_reactNative.Platform.select({web:void 0,default:_constants.constants.LIMIT_MAX_VALUE})};exports.default=SliderWithRef},"./node_modules/@react-native-community/slider/dist/components/StepNumber.js":function(__unused_webpack_module,exports,__webpack_require__){var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.StepNumber=void 0;_interopRequireDefault(__webpack_require__("./node_modules/react/index.js"));var _reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js"),_styles=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/styles.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");exports.StepNumber=function StepNumber(_ref){var i=_ref.i,style=_ref.style;return(0,_jsxRuntime.jsx)(_reactNative.View,{style:_styles.styles.stepNumber,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style,children:i})})}},"./node_modules/@react-native-community/slider/dist/components/StepsIndicator.js":function(__unused_webpack_module,exports,__webpack_require__){Object.defineProperty(exports,"__esModule",{value:!0}),exports.StepsIndicator=void 0;var _react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js"),_StepNumber=__webpack_require__("./node_modules/@react-native-community/slider/dist/components/StepNumber.js"),_TrackMark=__webpack_require__("./node_modules/@react-native-community/slider/dist/components/TrackMark.js"),_styles=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/styles.js"),_constants=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/constants.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}exports.StepsIndicator=function StepsIndicator(_ref){var options=_ref.options,sliderWidth=_ref.sliderWidth,currentValue=_ref.currentValue,StepMarker=_ref.StepMarker,renderStepNumber=_ref.renderStepNumber,thumbImage=_ref.thumbImage,isLTR=_ref.isLTR,stepNumberFontStyle={fontSize:options.length>9?_constants.constants.STEP_NUMBER_TEXT_FONT_SMALL:_constants.constants.STEP_NUMBER_TEXT_FONT_BIG},values=isLTR?options.reverse():options;return(0,_jsxRuntime.jsx)(_reactNative.View,{pointerEvents:"none",style:[_styles.styles.stepsIndicator,{marginHorizontal:sliderWidth*_constants.constants.MARGIN_HORIZONTAL_PADDING}],children:values.map((function(i,index){return(0,_jsxRuntime.jsx)(_react.Fragment,{children:(0,_jsxRuntime.jsxs)(_reactNative.View,{style:_styles.styles.stepIndicatorElement,children:[(0,_jsxRuntime.jsx)(_TrackMark.SliderTrackMark,{isTrue:currentValue===i,thumbImage,StepMarker,currentValue},`${index}-SliderTrackMark`),renderStepNumber?(0,_jsxRuntime.jsx)(_StepNumber.StepNumber,{i,style:stepNumberFontStyle},`${index}th-step`):null]})},index)}))})}},"./node_modules/@react-native-community/slider/dist/components/TrackMark.js":function(__unused_webpack_module,exports,__webpack_require__){var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.SliderTrackMark=void 0;_interopRequireDefault(__webpack_require__("./node_modules/react/index.js"));var _reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js"),_styles=__webpack_require__("./node_modules/@react-native-community/slider/dist/utils/styles.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");exports.SliderTrackMark=function SliderTrackMark(_ref){var isTrue=_ref.isTrue,thumbImage=_ref.thumbImage,StepMarker=_ref.StepMarker,currentValue=_ref.currentValue;return(0,_jsxRuntime.jsxs)(_reactNative.View,{style:_styles.styles.trackMarkContainer,children:[StepMarker?(0,_jsxRuntime.jsx)(StepMarker,{stepMarked:isTrue,currentValue}):null,thumbImage&&isTrue?(0,_jsxRuntime.jsx)(_reactNative.View,{style:_styles.styles.thumbImageContainer,children:(0,_jsxRuntime.jsx)(_reactNative.Image,{source:thumbImage,style:_styles.styles.thumbImage})}):null]})}},"./node_modules/@react-native-community/slider/dist/index.js":(__unused_webpack_module,exports,__webpack_require__)=>{Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var RNCSlider=__webpack_require__("./node_modules/@react-native-community/slider/dist/RNCSliderNativeComponent.web.js").default;exports.default=RNCSlider},"./node_modules/@react-native-community/slider/dist/utils/constants.js":(__unused_webpack_module,exports,__webpack_require__)=>{Object.defineProperty(exports,"__esModule",{value:!0}),exports.constants=void 0;var _reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js");exports.constants={MARGIN_HORIZONTAL_PADDING:.05,STEP_NUMBER_TEXT_FONT_SMALL:8,STEP_NUMBER_TEXT_FONT_BIG:12,LIMIT_MIN_VALUE:Number.MIN_SAFE_INTEGER,LIMIT_MAX_VALUE:Number.MAX_SAFE_INTEGER,DEFAULT_STEP_RESOLUTION:"android"===_reactNative.Platform.OS?128:1e3}},"./node_modules/@react-native-community/slider/dist/utils/styles.js":(__unused_webpack_module,exports,__webpack_require__)=>{Object.defineProperty(exports,"__esModule",{value:!0}),exports.styles=void 0;var _reactNative=__webpack_require__("./node_modules/react-native-web/dist/index.js");exports.styles=_reactNative.StyleSheet.create({stepNumber:{marginTop:20,alignItems:"center",position:"absolute"},sliderMainContainer:{zIndex:1,width:"100%"},defaultSlideriOS:{height:40},defaultSlider:{},stepsIndicator:{flex:1,flexDirection:"row",justifyContent:"space-between",top:"ios"===_reactNative.Platform.OS?10:0,zIndex:2},trackMarkContainer:{alignItems:"center",alignContent:"center",alignSelf:"center",justifyContent:"center",position:"absolute",zIndex:3},thumbImageContainer:{position:"absolute",zIndex:3,justifyContent:"center",alignItems:"center",alignContent:"center"},thumbImage:{alignContent:"center",alignItems:"center",position:"absolute"},stepIndicatorElement:{alignItems:"center",alignContent:"center"},defaultIndicatorMarked:{height:20,width:5,backgroundColor:"#CCCCCC"},defaultIndicatorIdle:{height:10,width:2,backgroundColor:"#C0C0C0"}})}}]);