(self.webpackChunk_siteed_design_system=self.webpackChunk_siteed_design_system||[]).push([[4618],{"./src/components/EditableInfoCard/EditableInfoCard.tsx":(__unused_webpack_module,exports,__webpack_require__)=>{var _interopRequireDefault=__webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports,"__esModule",{value:!0}),exports.EditableInfoCard=EditableInfoCard;var _slicedToArray2=_interopRequireDefault(__webpack_require__("./node_modules/@babel/runtime/helpers/slicedToArray.js")),_react=function _interopRequireWildcard(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=_getRequireWildcardCache(r);if(t&&t.has(e))return t.get(e);var n={__proto__:null},a=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&{}.hasOwnProperty.call(e,u)){var i=a?Object.getOwnPropertyDescriptor(e,u):null;i&&(i.get||i.set)?Object.defineProperty(n,u,i):n[u]=e[u]}return n.default=e,t&&t.set(e,n),n}(__webpack_require__("./node_modules/react/index.js")),_Pressable=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/Pressable/index.js")),_StyleSheet=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/StyleSheet/index.js")),_View=_interopRequireDefault(__webpack_require__("./node_modules/react-native-web/dist/exports/View/index.js")),_reactNativePaper=__webpack_require__("./node_modules/react-native-paper/lib/module/index.js"),_ThemeProvider=__webpack_require__("./src/providers/ThemeProvider.tsx"),_TextInput=__webpack_require__("./src/components/TextInput/TextInput.tsx"),_jsxRuntime=__webpack_require__("./node_modules/react/jsx-runtime.js");function _getRequireWildcardCache(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,t=new WeakMap;return(_getRequireWildcardCache=function _getRequireWildcardCache(e){return e?t:r})(e)}var getStyles=function getStyles(_ref){var theme=_ref.theme;return _StyleSheet.default.create({container:{flexDirection:"row",alignItems:"center",paddingHorizontal:5,backgroundColor:theme.colors.background,borderWidth:1,borderRadius:8},contentContainer:{flex:1,flexDirection:"column",justifyContent:"center"},label:{fontWeight:"bold"},content:{maxWidth:"100%"},iconContainer:{alignSelf:"stretch",justifyContent:"center",marginLeft:5},icon:{}})};function EditableInfoCard(_ref2){var label=_ref2.label,value=_ref2.value,error=_ref2.error,processing=_ref2.processing,editable=_ref2.editable,inlineEditable=_ref2.inlineEditable,onEdit=_ref2.onEdit,onInlineEdit=_ref2.onInlineEdit,renderValue=_ref2.renderValue,containerStyle=_ref2.containerStyle,contentStyle=_ref2.contentStyle,labelStyle=_ref2.labelStyle,rightAction=_ref2.rightAction,onRightActionPress=_ref2.onRightActionPress,theme=(0,_ThemeProvider.useTheme)(),styles=(0,_react.useMemo)((function(){return getStyles({theme})}),[theme]),_useState=(0,_react.useState)(!1),_useState2=(0,_slicedToArray2.default)(_useState,2),isEditing=_useState2[0],setIsEditing=_useState2[1],_useState3=(0,_react.useState)(value),_useState4=(0,_slicedToArray2.default)(_useState3,2),editedValue=_useState4[0],setEditedValue=_useState4[1];(0,_react.useEffect)((function(){setEditedValue(value)}),[value]);var handleEdit=function handleEdit(){inlineEditable?setIsEditing(!0):editable&&onEdit&&onEdit()},handleInlineEditComplete=function handleInlineEditComplete(){setIsEditing(!1),onInlineEdit&&editedValue!==value&&onInlineEdit(editedValue)},defaultRightAction=editable||inlineEditable?(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{children:[isEditing&&(0,_jsxRuntime.jsx)(_reactNativePaper.IconButton,{icon:"close",size:20,style:styles.icon,onPress:function handleInlineEditCancel(){setIsEditing(!1),setEditedValue(value)},accessibilityLabel:"Cancel editing"}),(0,_jsxRuntime.jsx)(_reactNativePaper.IconButton,{icon:isEditing?"check":"pencil",size:20,style:styles.icon,onPress:isEditing?handleInlineEditComplete:handleEdit,accessibilityLabel:isEditing?"Confirm edit":"Edit value"})]}):null,rightActionComponent=null!=rightAction?rightAction:defaultRightAction,content=(0,_jsxRuntime.jsxs)(_View.default,{style:[styles.container,containerStyle],children:[(0,_jsxRuntime.jsxs)(_View.default,{style:styles.contentContainer,children:[label?(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{style:[styles.label,labelStyle],children:label}):null,(0,_jsxRuntime.jsx)(_View.default,{style:[styles.content,contentStyle],children:processing?(0,_jsxRuntime.jsx)(_reactNativePaper.ActivityIndicator,{size:"small"}):isEditing?(0,_jsxRuntime.jsx)(_TextInput.TextInput,{autoFocus:!0,value:editedValue,onChangeText:setEditedValue,onBlur:handleInlineEditComplete,onSubmitEditing:handleInlineEditComplete,style:{backgroundColor:"transparent"}}):renderValue?renderValue(value):(0,_jsxRuntime.jsx)(_reactNativePaper.Text,{style:{color:error?theme.colors.error:theme.colors.text},children:"string"==typeof value?value:null==value?void 0:value.toString()})})]}),rightActionComponent&&(0,_jsxRuntime.jsx)(_View.default,{style:styles.iconContainer,children:rightActionComponent})]});return(0,_jsxRuntime.jsx)(_Pressable.default,{onPress:function handlePress(){inlineEditable||editable?handleEdit():onRightActionPress&&onRightActionPress()},disabled:!editable&&!inlineEditable&&!onRightActionPress,children:content})}try{EditableInfoCard.displayName="EditableInfoCard",EditableInfoCard.__docgenInfo={description:"",displayName:"EditableInfoCard",props:{label:{defaultValue:null,description:"",name:"label",required:!1,type:{name:"string"}},value:{defaultValue:null,description:"",name:"value",required:!1,type:{name:"unknown"}},processing:{defaultValue:null,description:"",name:"processing",required:!1,type:{name:"boolean"}},error:{defaultValue:null,description:"",name:"error",required:!1,type:{name:"boolean"}},renderValue:{defaultValue:null,description:"",name:"renderValue",required:!1,type:{name:"((value?: unknown) => ReactNode)"}},editable:{defaultValue:null,description:"",name:"editable",required:!1,type:{name:"boolean"}},inlineEditable:{defaultValue:null,description:"",name:"inlineEditable",required:!1,type:{name:"boolean"}},onEdit:{defaultValue:null,description:"",name:"onEdit",required:!1,type:{name:"(() => void)"}},onInlineEdit:{defaultValue:null,description:"",name:"onInlineEdit",required:!1,type:{name:"((newValue?: unknown) => void)"}},labelStyle:{defaultValue:null,description:"",name:"labelStyle",required:!1,type:{name:"StyleProp<TextStyle>"}},containerStyle:{defaultValue:null,description:"",name:"containerStyle",required:!1,type:{name:"StyleProp<ViewStyle>"}},contentStyle:{defaultValue:null,description:"",name:"contentStyle",required:!1,type:{name:"StyleProp<ViewStyle>"}},rightAction:{defaultValue:null,description:"",name:"rightAction",required:!1,type:{name:"ReactNode"}},onRightActionPress:{defaultValue:null,description:"",name:"onRightActionPress",required:!1,type:{name:"(() => void)"}}}},"undefined"!=typeof STORYBOOK_REACT_CLASSES&&(STORYBOOK_REACT_CLASSES["src/components/EditableInfoCard/EditableInfoCard.tsx#EditableInfoCard"]={docgenInfo:EditableInfoCard.__docgenInfo,name:"EditableInfoCard",path:"src/components/EditableInfoCard/EditableInfoCard.tsx#EditableInfoCard"})}catch(__react_docgen_typescript_loader_error){}}}]);