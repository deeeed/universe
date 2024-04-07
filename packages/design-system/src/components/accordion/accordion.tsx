import React, { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleProp,
  TextStyle,
  UIManager,
} from 'react-native';
import {
  AccordionItem,
  AccordionItemProps,
} from './accordion-item/accordion-item';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionProps {
  data: AccordionItemProps[];
  titleStyle?: StyleProp<TextStyle>;
  animationConfig?: typeof LayoutAnimation.Presets.spring;
  singleExpand?: boolean; // New prop for single expand functionality
}

export const Accordion = ({
  data,
  animationConfig,
  singleExpand,
}: AccordionProps) => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const handleHeaderPress = useCallback(
    (index: number) => {
      LayoutAnimation.configureNext(
        animationConfig || LayoutAnimation.Presets.easeInEaseOut
      );
      setExpandedIndices((prevIndices) => {
        const isExpanded = prevIndices.includes(index);

        if (singleExpand) {
          return isExpanded ? [] : [index];
        }

        return isExpanded
          ? prevIndices.filter((i) => i !== index)
          : [...prevIndices, index];
      });
    },
    [animationConfig, singleExpand]
  );

  return (
    <>
      {data.map((item, index) => (
        <AccordionItem
          key={index}
          title={item.title}
          expanded={expandedIndices.includes(index)}
          titleStyle={item.titleStyle}
          onHeaderPress={() => handleHeaderPress(index)}
        >
          {item.children}
        </AccordionItem>
      ))}
    </>
  );
};
