import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Text, View } from 'react-native';
import { Accordion } from '../../components/Accordion/Accordion';
import { AccordionItemProps } from '../../components/Accordion/AccordionItem/AccordionItem';
import { Button } from '../../components/Button/Button';
import { useModal } from './useModal';
import { baseLogger } from '../../utils/logger';

const logger = baseLogger.extend('openDrawer');

const OpenDrawerExample: React.FC = () => {
  const { openDrawer } = useModal();

  const handleSimpleDrawer = async () => {
    const result = await openDrawer({
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
      },
      title: 'Simple Drawer',
      initialData: { count: 0 },
      render: ({ data, resolve, onChange }) => {
        return (
          <View>
            <Text>Count: {data.count}</Text>
            <Button onPress={() => onChange({ count: data.count + 1 })}>
              Increment
            </Button>
            <Button onPress={() => resolve(data)}>Close</Button>
          </View>
        );
      },
      renderFooter: ({ data, resolve }) => (
        <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
          <Text>Count: {data.count}</Text>
          <Button onPress={() => resolve(data)}>Close</Button>
        </View>
      ),
    });
    logger.info('Simple drawer result:', result);
  };

  const accordionData: AccordionItemProps[] = [
    {
      title: 'Accordion Item 1',
      children: <Text>Content 1</Text>,
    },
    {
      title: 'Accordion Item 2',
      children: (
        <View>
          {Array.from({ length: 100 }, (_, i) => (
            <Text key={i}>Item {i}</Text>
          ))}
        </View>
      ),
    },
    {
      title: 'Accordion Item 3',
      children: <Text>Content 3</Text>,
    },
  ];

  const handleDynamicDrawer = async () => {
    const result = await openDrawer({
      title: 'Dynamic Drawer',
      containerType: 'scrollview',
      initialData: { selectedItem: null },
      render: (_) => {
        return <Accordion data={accordionData} />;
      },
      renderFooter: ({ data, resolve }) => (
        <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
          <Text>Selected: {data.selectedItem || 'None'}</Text>
          <Button onPress={() => resolve(data)}>Confirm</Button>
        </View>
      ),
    });
    logger.info('Dynamic drawer result:', result);
  };

  const handleDrawerWithCustomHandler = async () => {
    const result = await openDrawer({
      initialData: { isOpen: true },
      renderHandler: ({ data, onChange }) => (
        <View style={{ padding: 16, backgroundColor: '#e0e0e0' }}>
          <Text>Custom Handler</Text>
          <Button onPress={() => onChange({ isOpen: !data.isOpen })}>
            {data.isOpen ? 'Close' : 'Open'}
          </Button>
        </View>
      ),
      render: ({ data }) => (
        <View>
          <Text>Drawer is {data.isOpen ? 'Open' : 'Closed'}</Text>
        </View>
      ),
    });
    logger.info('Custom handler drawer result:', result);
  };

  const handleNestedDrawers = async () => {
    await openDrawer({
      title: 'First Drawer',
      initialData: { level: 1 },
      render: ({ data, onChange }) => (
        <View>
          <Text>This is the first drawer (Level {data.level})</Text>
          <Button
            onPress={() =>
              openDrawer({
                title: 'Second Drawer',
                initialData: { level: data.level + 1 },
                render: ({ data: nestedData, resolve }) => (
                  <View>
                    <Text>
                      This is the second drawer (Level {nestedData.level})
                    </Text>
                    <Button onPress={() => resolve(nestedData)}>Close</Button>
                  </View>
                ),
              }).then((result) => {
                logger.info('Nested drawer result:', result);
                onChange({ level: result?.level || data.level });
              })
            }
          >
            Open Second Drawer
          </Button>
        </View>
      ),
    });
  };

  return (
    <View>
      <Button onPress={handleSimpleDrawer}>Open Simple Drawer</Button>
      <Button onPress={handleDynamicDrawer}>
        Open Dynamic ScrollView Drawer (with accordion)
      </Button>
      <Button onPress={handleDrawerWithCustomHandler}>
        Open Drawer with Custom Handler
      </Button>
      <Button onPress={handleNestedDrawers}>Open Nested Drawers</Button>
    </View>
  );
};

const meta: Meta<typeof OpenDrawerExample> = {
  title: 'Hooks/useModal/openDrawer',
  component: OpenDrawerExample,
};

export default meta;

type Story = StoryObj<typeof OpenDrawerExample>;

export const Default: Story = {};
export const WithCustomHandler: Story = {};
export const WithCustomFooter: Story = {};
export const NestedDrawers: Story = {};
