import React, { useState, useCallback } from 'react';
import {
  StyleProp,
  TextStyle,
  ViewStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  AccordionItem,
  AccordionItemProps,
} from './AccordionItem/AccordionItem';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionProps {
  data: AccordionItemProps[];
  titleStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  animationConfig?: typeof LayoutAnimation.Presets.spring;
  singleExpand?: boolean;
}

export const Accordion = ({
  data,
  titleStyle,
  contentContainerStyle,
  animationConfig,
  singleExpand = false,
}: AccordionProps) => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>(
    data.reduce<number[]>(
      (acc, item, index) => (item.expanded ? [...acc, index] : acc),
      []
    )
  );

  const handleHeaderPress = useCallback(
    (index: number) => {
      if (animationConfig) {
        LayoutAnimation.configureNext(
          animationConfig || LayoutAnimation.Presets.easeInEaseOut
        );
      }

      setExpandedIndices((prevIndices) => {
        const isExpanded = prevIndices.includes(index);

        if (singleExpand) {
          return isExpanded ? [] : [index];
        }

        return isExpanded
          ? prevIndices.filter((i) => i !== index)
          : [...prevIndices, index];
      });

      // Call the original onHeaderPress if provided
      data[index]?.onHeaderPress?.();
    },
    [animationConfig, singleExpand, data]
  );

  return (
    <>
      {data.map((item, index) => (
        <AccordionItem
          key={index}
          {...item}
          titleStyle={[titleStyle, item.titleStyle]}
          contentContainerStyle={[
            contentContainerStyle,
            item.contentContainerStyle,
          ]}
          expanded={expandedIndices.includes(index)}
          onHeaderPress={() => handleHeaderPress(index)}
        />
      ))}
    </>
  );
};
