(self.webpackChunk_siteed_design_system=self.webpackChunk_siteed_design_system||[]).push([[2870,1607,7424],{"./src/components/Picker/Picker.tsx":(__unused_webpack_module,exports,__webpack_require__)=>{var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.Picker=void 0;var _asyncToGenerator2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/asyncToGenerator.js")),_slicedToArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/slicedToArray.js")),_vectorIcons=__webpack_require__("./node_modules/@expo/vector-icons/build/Icons.js"),_react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_Pressable=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/Pressable/index.js")),_StyleSheet=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/StyleSheet/index.js")),_View=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/View/index.js")),_reactNativePaper=__webpack_require__("./node_modules/react-native-paper/lib/module/index.js"),_useModal2=__webpack_require__("./src/hooks/useModal/useModal.tsx"),_ThemeProvider=__webpack_require__("./src/providers/ThemeProvider.tsx"),_logger=__webpack_require__("./src/utils/logger.ts"),_ConfirmCancelFooter=__webpack_require__("./src/components/bottom-modal/footers/ConfirmCancelFooter.tsx"),_PickerContent=__webpack_require__("./src/components/Picker/PickerContent.tsx"),_reactNativeGestureHandler=__webpack_require__("./node_modules/react-native-gesture-handler/lib/module/index.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var logger=_logger.baseLogger.extend("Picker"),Picker=exports.Picker=function Picker(_ref){var initialOptions=_ref.options,label=_ref.label,_ref$multi=_ref.multi,multi=void 0!==_ref$multi&&_ref$multi,_ref$showSearch=_ref.showSearch,showSearch=void 0!==_ref$showSearch&&_ref$showSearch,_ref$fullWidthOptions=_ref.fullWidthOptions,fullWidthOptions=void 0!==_ref$fullWidthOptions&&_ref$fullWidthOptions,_ref$emptyLabel=_ref.emptyLabel,emptyLabel=void 0===_ref$emptyLabel?"No options available":_ref$emptyLabel,_ref$emptyOptionsTitl=_ref.emptyOptionsTitle,emptyOptionsTitle=void 0===_ref$emptyOptionsTitl?"No options available":_ref$emptyOptionsTitl,_ref$emptyOptionsMess=_ref.emptyOptionsMessage,emptyOptionsMessage=void 0===_ref$emptyOptionsMess?"No options available":_ref$emptyOptionsMess,_ref$noResultsText=_ref.noResultsText,noResultsText=void 0===_ref$noResultsText?"No options available":_ref$noResultsText,_ref$emptyActionLabel=_ref.emptyActionLabel,emptyActionLabel=void 0===_ref$emptyActionLabel?"Create New":_ref$emptyActionLabel,onFinish=_ref.onFinish,emptyAction=_ref.emptyAction,theme=(0,_ThemeProvider.useTheme)(),styles=(0,_react.useMemo)((function(){return function getStyles(theme){return _StyleSheet.default.create({container:{backgroundColor:theme.colors.surface,padding:theme.spacing.padding},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},title:{flexGrow:1},optionsContainer:{flexDirection:"row",flexWrap:"wrap",gap:theme.spacing.gap,minHeight:40},scrollViewContent:{flexGrow:1,paddingVertical:8}})}(theme)}),[theme]),_useState=(0,_react.useState)(initialOptions),_useState2=(0,_slicedToArray2.default)(_useState,2),activeOptions=_useState2[0],setActiveOptions=_useState2[1],_useState3=(0,_react.useState)(initialOptions),_useState4=(0,_slicedToArray2.default)(_useState3,2),tempOptions=_useState4[0],setTempOptions=_useState4[1],selectedOptions=activeOptions.filter((function(option){return option.selected})),openDrawer=(0,_useModal2.useModal)().openDrawer;(0,_react.useEffect)((function(){setActiveOptions(initialOptions),setTempOptions(initialOptions)}),[initialOptions]);var handlePick=(0,_react.useCallback)((0,_asyncToGenerator2.default)((function*(){try{var result=yield openDrawer({title:label,initialData:tempOptions,render:function render(_ref3){var onChange=_ref3.onChange,data=_ref3.data;return(0,_jsxRuntime.jsx)(_PickerContent.PickerContent,{options:data||[],multi,showSearch,emptyLabel,emptyOptionsTitle,emptyOptionsMessage,noResultsText,emptyActionLabel,fullWidthOptions,onChange,emptyAction})},renderFooter:function renderFooter(_ref4){var data=_ref4.data,resolve=_ref4.resolve;return 0!==initialOptions.length||data?(0,_jsxRuntime.jsx)(_ConfirmCancelFooter.ConfirmCancelFooter,{onCancel:function onCancel(){logger.debug("onCancel"),resolve(void 0)},onFinish:function onFinish(){logger.debug("onConfirm > selectedData",data),setActiveOptions(data||[]),logger.debug("resolve now",data),resolve(data),logger.debug("resolve done")}}):null}});logger.debug("result",result),null==onFinish||onFinish(result||initialOptions)}catch(error){logger.error("Error opening picker",error)}})),[openDrawer,label,tempOptions,multi,showSearch,fullWidthOptions,emptyAction,initialOptions.length,selectedOptions,onFinish]);return(0,_jsxRuntime.jsxs)(_View.default,{style:styles.container,children:[(0,_jsxRuntime.jsxs)(_Pressable.default,{style:styles.header,onPress:handlePick,children:[(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{style:styles.title,variant:"headlineMedium",children:label}),(0,_jsxRuntime.jsx)(_Pressable.default,{onPress:handlePick,testID:"picker-right-handle",children:(0,_jsxRuntime.jsx)(_vectorIcons.AntDesign,{name:"right",size:24,color:theme.colors.text})})]}),(0,_jsxRuntime.jsx)(_reactNativeGestureHandler.ScrollView,{horizontal:!0,contentContainerStyle:[styles.optionsContainer,styles.scrollViewContent],showsHorizontalScrollIndicator:!1,children:0===selectedOptions.length?(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{children:"No options selected"}):selectedOptions.map((function(option){return(0,_jsxRuntime.jsx)(_reactNativePaper.Chip,{mode:"flat",style:{backgroundColor:option.color},children:option.label},option.value)}))})]})};try{Picker.displayName="Picker",Picker.__docgenInfo={description:"",displayName:"Picker",props:{options:{defaultValue:null,description:"",name:"options",required:!0,type:{name:"SelectOption[]"}},label:{defaultValue:null,description:"",name:"label",required:!0,type:{name:"string"}},multi:{defaultValue:{value:"false"},description:"",name:"multi",required:!1,type:{name:"boolean"}},closable:{defaultValue:null,description:"",name:"closable",required:!1,type:{name:"boolean"}},showFooter:{defaultValue:null,description:"",name:"showFooter",required:!1,type:{name:"boolean"}},emptyLabel:{defaultValue:{value:"No options available"},description:"",name:"emptyLabel",required:!1,type:{name:"string"}},enableDynamicSizing:{defaultValue:null,description:"",name:"enableDynamicSizing",required:!1,type:{name:"boolean"}},showSearch:{defaultValue:{value:"false"},description:"",name:"showSearch",required:!1,type:{name:"boolean"}},fullWidthOptions:{defaultValue:{value:"false"},description:"",name:"fullWidthOptions",required:!1,type:{name:"boolean"}},onFinish:{defaultValue:null,description:"",name:"onFinish",required:!1,type:{name:"((selection: SelectOption[]) => void)"}},onItemPress:{defaultValue:null,description:"",name:"onItemPress",required:!1,type:{name:"((item: SelectOption) => void)"}},emptyAction:{defaultValue:null,description:"",name:"emptyAction",required:!1,type:{name:"(() => void)"}},emptyOptionsTitle:{defaultValue:{value:"No options available"},description:"",name:"emptyOptionsTitle",required:!1,type:{name:"string"}},emptyOptionsMessage:{defaultValue:{value:"No options available"},description:"",name:"emptyOptionsMessage",required:!1,type:{name:"string"}},noResultsText:{defaultValue:{value:"No options available"},description:"",name:"noResultsText",required:!1,type:{name:"string"}},emptyActionLabel:{defaultValue:{value:"Create New"},description:"",name:"emptyActionLabel",required:!1,type:{name:"string"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/Picker/Picker.tsx#Picker"]={docgenInfo:Picker.__docgenInfo,name:"Picker",path:"src/components/Picker/Picker.tsx#Picker"})}catch(__react_docgen_typescript_loader_error){}},"./src/components/Picker/PickerContent.tsx":(__unused_webpack_module,exports,__webpack_require__)=>{var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.PickerContent=void 0;var _slicedToArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/slicedToArray.js")),_react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_StyleSheet=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/StyleSheet/index.js")),_View=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/View/index.js")),_reactNativePaper=__webpack_require__("./node_modules/react-native-paper/lib/module/index.js"),_ThemeProvider=__webpack_require__("./src/providers/ThemeProvider.tsx"),_Result=__webpack_require__("./src/components/Result/Result.tsx"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var PickerContent=exports.PickerContent=function PickerContent(_ref){var options=_ref.options,multi=_ref.multi,showSearch=_ref.showSearch,fullWidthOptions=_ref.fullWidthOptions,emptyAction=_ref.emptyAction,emptyOptionsTitle=_ref.emptyOptionsTitle,emptyOptionsMessage=_ref.emptyOptionsMessage,emptyActionLabel=_ref.emptyActionLabel,noResultsText=_ref.noResultsText,onChange=_ref.onChange,onItemPress=_ref.onItemPress,theme=(0,_ThemeProvider.useTheme)(),styles=(0,_react.useMemo)((function(){return function getStyles(theme){return _StyleSheet.default.create({container:{padding:theme.spacing.padding},searchBar:{marginBottom:theme.spacing.margin},optionsContainer:{flexDirection:"row",flexWrap:"wrap",gap:theme.spacing.gap,minHeight:40},optionItem:{marginBottom:theme.spacing.margin}})}(theme)}),[theme]),_useState=(0,_react.useState)(""),_useState2=(0,_slicedToArray2.default)(_useState,2),searchQuery=_useState2[0],setSearchQuery=_useState2[1],_useState3=(0,_react.useState)(options),_useState4=(0,_slicedToArray2.default)(_useState3,2),tempOptions=_useState4[0],setTempOptions=_useState4[1],filteredOptions=(0,_react.useMemo)((function(){return tempOptions.filter((function(option){return option.label.toLowerCase().includes(searchQuery.toLowerCase())}))}),[tempOptions,searchQuery]),handleSelectOption=(0,_react.useCallback)((function(selectedOption){var updatedOptions=tempOptions.map((function(option){return option.value===selectedOption.value?Object.assign({},option,{selected:!multi||!option.selected}):multi?option:Object.assign({},option,{selected:!1})}));console.log("updatedOptions",updatedOptions),setTempOptions(updatedOptions),onChange(updatedOptions),null==onItemPress||onItemPress(selectedOption)}),[tempOptions,multi,onChange,onItemPress]),renderOptions=(0,_react.useCallback)((function(){return(0,_jsxRuntime.jsx)(_View.default,{style:styles.optionsContainer,children:filteredOptions.map((function(option){return(0,_jsxRuntime.jsx)(_View.default,{style:[styles.optionItem,fullWidthOptions&&{width:"100%"}],children:(0,_jsxRuntime.jsx)(_reactNativePaper.Chip,{mode:option.selected?"flat":"outlined",selected:option.selected,onPress:function onPress(){return handleSelectOption(option)},style:fullWidthOptions?{width:"100%"}:{},children:option.label})},option.value)}))})}),[filteredOptions,styles,fullWidthOptions,handleSelectOption]);return 0===tempOptions.length?(0,_jsxRuntime.jsx)(_View.default,{style:styles.container,children:(0,_jsxRuntime.jsx)(_Result.Result,{status:"info",title:emptyOptionsTitle,message:emptyOptionsMessage,buttonText:emptyActionLabel,onButtonPress:emptyAction})}):(0,_jsxRuntime.jsxs)(_View.default,{style:styles.container,children:[showSearch&&(0,_jsxRuntime.jsx)(_reactNativePaper.Searchbar,{placeholder:"Search options",onChangeText:setSearchQuery,value:searchQuery,style:styles.searchBar}),0===filteredOptions.length?(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{children:noResultsText}):renderOptions()]})};try{PickerContent.displayName="PickerContent",PickerContent.__docgenInfo={description:"",displayName:"PickerContent",props:{options:{defaultValue:null,description:"",name:"options",required:!0,type:{name:"SelectOption[]"}},multi:{defaultValue:null,description:"",name:"multi",required:!0,type:{name:"boolean"}},showSearch:{defaultValue:null,description:"",name:"showSearch",required:!0,type:{name:"boolean"}},fullWidthOptions:{defaultValue:null,description:"",name:"fullWidthOptions",required:!0,type:{name:"boolean"}},emptyLabel:{defaultValue:null,description:"",name:"emptyLabel",required:!0,type:{name:"string"}},emptyAction:{defaultValue:null,description:"",name:"emptyAction",required:!1,type:{name:"(() => void)"}},emptyOptionsTitle:{defaultValue:null,description:"",name:"emptyOptionsTitle",required:!0,type:{name:"string"}},emptyOptionsMessage:{defaultValue:null,description:"",name:"emptyOptionsMessage",required:!0,type:{name:"string"}},noResultsText:{defaultValue:null,description:"",name:"noResultsText",required:!0,type:{name:"string"}},emptyActionLabel:{defaultValue:null,description:"",name:"emptyActionLabel",required:!0,type:{name:"string"}},onChange:{defaultValue:null,description:"",name:"onChange",required:!0,type:{name:"(options: SelectOption[]) => void"}},onItemPress:{defaultValue:null,description:"",name:"onItemPress",required:!1,type:{name:"((item: SelectOption) => void)"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/Picker/PickerContent.tsx#PickerContent"]={docgenInfo:PickerContent.__docgenInfo,name:"PickerContent",path:"src/components/Picker/PickerContent.tsx#PickerContent"})}catch(__react_docgen_typescript_loader_error){}},"./src/components/Result/Result.tsx":(__unused_webpack_module,exports,__webpack_require__)=>{var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.Result=void 0;var _react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_Image=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/Image/index.js")),_StyleSheet=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/StyleSheet/index.js")),_View=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/View/index.js")),_reactNativePaper=__webpack_require__("./node_modules/react-native-paper/lib/module/index.js"),_Button=__webpack_require__("./src/components/Button/Button.tsx"),_ThemeProvider=__webpack_require__("./src/providers/ThemeProvider.tsx"),_vectorIcons=__webpack_require__("./node_modules/@expo/vector-icons/build/Icons.js"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var Result=exports.Result=function Result(_ref2){var _ref2$buttonText=_ref2.buttonText,buttonText=void 0===_ref2$buttonText?"ACTION":_ref2$buttonText,_ref2$buttonMode=_ref2.buttonMode,buttonMode=void 0===_ref2$buttonMode?"contained":_ref2$buttonMode,_ref2$secondaryButton=_ref2.secondaryButtonMode,secondaryButtonMode=void 0===_ref2$secondaryButton?"outlined":_ref2$secondaryButton,secondaryButtonText=_ref2.secondaryButtonText,_ref2$status=_ref2.status,status=void 0===_ref2$status?"info":_ref2$status,img=_ref2.img,imgUrl=_ref2.imgUrl,imgStyle=_ref2.imgStyle,message=_ref2.message,extra=_ref2.extra,onButtonPress=_ref2.onButtonPress,onSecondaryButtonPress=_ref2.onSecondaryButtonPress,style=_ref2.style,title=_ref2.title,theme=(0,_ThemeProvider.useTheme)(),styles=(0,_react.useMemo)((function(){return function getStyles(_ref){var theme=_ref.theme;return _StyleSheet.default.create({container:{alignItems:"center",paddingVertical:theme.padding.l,gap:10},imgWrap:{margin:0},img:{width:60,height:60},titleContainer:{},titleText:{},messageContainer:{},messageText:{},buttonWrap:{flexDirection:"row",gap:10},extraContainer:{},button:{flex:1}})}({theme})}),[theme]),imgContent=null;if(img)imgContent=(0,_jsxRuntime.jsx)(_View.default,{style:styles.imgWrap,children:img});else if(imgUrl)imgContent=(0,_jsxRuntime.jsx)(_View.default,{style:styles.imgWrap,children:(0,_jsxRuntime.jsx)(_Image.default,{source:imgUrl,style:[styles.img,imgStyle]})});else{var icon="information",iconColor={info:theme.colors.info,warning:theme.colors.warning,error:theme.colors.error,success:theme.colors.success}[status];switch(status){case"success":icon="check-circle";break;case"error":icon="close-circle";break;case"info":icon="information";break;case"warning":icon="alert"}imgContent=(0,_jsxRuntime.jsx)(_vectorIcons.MaterialCommunityIcons,{name:icon,size:60,color:iconColor})}return(0,_jsxRuntime.jsxs)(_View.default,{style:[styles.container,style],children:[imgContent,title?(0,_jsxRuntime.jsx)(_View.default,{style:styles.titleContainer,children:(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{variant:"headlineMedium",style:styles.titleText,children:title})}):null,message?(0,_jsxRuntime.jsx)(_View.default,{style:styles.messageContainer,children:(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{variant:"bodyMedium",style:styles.messageText,children:message})}):null,(0,_jsxRuntime.jsxs)(_View.default,{style:styles.buttonWrap,children:[onButtonPress?(0,_jsxRuntime.jsx)(_Button.Button,{style:styles.button,mode:buttonMode,onPress:onButtonPress,children:buttonText}):null,secondaryButtonText?(0,_jsxRuntime.jsx)(_Button.Button,{mode:secondaryButtonMode,onPress:onSecondaryButtonPress,children:secondaryButtonText}):null]}),extra&&(0,_jsxRuntime.jsx)(_View.default,{style:styles.extraContainer,children:extra})]})};try{Result.displayName="Result",Result.__docgenInfo={description:"",displayName:"Result",props:{status:{defaultValue:{value:"info"},description:"",name:"status",required:!1,type:{name:"enum",value:[{value:'"info"'},{value:'"success"'},{value:'"warning"'},{value:'"error"'}]}},img:{defaultValue:null,description:"",name:"img",required:!1,type:{name:"ReactNode"}},imgUrl:{defaultValue:null,description:"",name:"imgUrl",required:!1,type:{name:"ImageSourcePropType"}},imgStyle:{defaultValue:null,description:"",name:"imgStyle",required:!1,type:{name:"StyleProp<ImageStyle>"}},title:{defaultValue:null,description:"",name:"title",required:!0,type:{name:"ReactNode"}},message:{defaultValue:null,description:"",name:"message",required:!1,type:{name:"ReactNode"}},buttonText:{defaultValue:{value:"ACTION"},description:"",name:"buttonText",required:!1,type:{name:"string"}},buttonMode:{defaultValue:{value:"contained"},description:"",name:"buttonMode",required:!1,type:{name:"enum",value:[{value:'"text"'},{value:'"outlined"'},{value:'"contained"'},{value:'"elevated"'},{value:'"contained-tonal"'}]}},secondaryButtonText:{defaultValue:null,description:"",name:"secondaryButtonText",required:!1,type:{name:"string"}},secondaryButtonMode:{defaultValue:{value:"outlined"},description:"",name:"secondaryButtonMode",required:!1,type:{name:"enum",value:[{value:'"text"'},{value:'"outlined"'},{value:'"contained"'},{value:'"elevated"'},{value:'"contained-tonal"'}]}},style:{defaultValue:null,description:"",name:"style",required:!1,type:{name:"StyleProp<ViewStyle>"}},extra:{defaultValue:null,description:"",name:"extra",required:!1,type:{name:"ReactNode"}},onButtonPress:{defaultValue:null,description:"",name:"onButtonPress",required:!1,type:{name:"((e: GestureResponderEvent) => void)"}},onSecondaryButtonPress:{defaultValue:null,description:"",name:"onSecondaryButtonPress",required:!1,type:{name:"((e: GestureResponderEvent) => void)"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/Result/Result.tsx#Result"]={docgenInfo:Result.__docgenInfo,name:"Result",path:"src/components/Result/Result.tsx#Result"})}catch(__react_docgen_typescript_loader_error){}}}]);