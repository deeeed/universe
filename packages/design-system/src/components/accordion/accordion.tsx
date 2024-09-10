import React, { useState, useCallback } from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  AccordionItem,
  AccordionItemProps,
} from './AccordionItem/AccordionItem';

export interface AccordionProps {
  data: AccordionItemProps[];
  titleStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  singleExpand?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  data,
  titleStyle,
  contentContainerStyle,
  singleExpand = false,
}) => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>(
    data.reduce<number[]>(
      (acc, item, index) => (item.expanded ? [...acc, index] : acc),
      []
    )
  );

  const handleHeaderPress = useCallback(
    (index: number) => {
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
    [singleExpand, data]
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
