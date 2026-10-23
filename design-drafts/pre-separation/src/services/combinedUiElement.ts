import React from 'react';
import {getProductLanguage} from './productI18nService';
import {sourceUiText} from './sourceUiTextService';
// Same presentation-only translation rule as the supplied combined UI.
// Prompt inputs, outputs, code and citation values stay verbatim.
export function combinedElement(type:any,props:any,...children:any[]):React.ReactElement {
 if(typeof type==='string'){
  props=props?{...props}:{};
  for(const key of ['placeholder','title','aria-label','alt'])if(typeof props[key]==='string')props[key]=sourceUiText(props[key],getProductLanguage());
  if(type==='option'&&props.value===undefined&&typeof children[0]==='string')props.value=children[0];
  if(!['pre','code','textarea','script','style'].includes(type))children=children.map(function translate(value:any):any{return Array.isArray(value)?value.map(translate):typeof value==='string'?sourceUiText(value,getProductLanguage()):value;});
 }
 return React.createElement(type,props,...children);
}
export namespace combinedElement {
 export namespace JSX {
  export type ElementType = React.JSX.ElementType; export type Element = React.JSX.Element;
  export type ElementClass = React.JSX.ElementClass;
  export type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
  export type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  export type IntrinsicElements = React.JSX.IntrinsicElements;
  export type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
  export type LibraryManagedAttributes<C,P> = React.JSX.LibraryManagedAttributes<C,P>;
 }
}

