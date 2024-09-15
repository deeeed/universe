import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Text, View } from 'react-native';
import { Accordion } from '../../components/Accordion/Accordion';
import { AccordionItemProps } from '../../components/Accordion/AccordionItem/AccordionItem';
import { Button } from '../../components/Button/Button';
import { useModal } from './useModal';

const OpenDrawerExample: React.FC = () => {
  const { openDrawer, dismissAll } = useModal();

  const handleSimpleDrawer = async () => {
    const result = await openDrawer({
      title: 'Simple Drawer',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => {
        return <Text>Simple drawer content</Text>;
      },
    });
    console.log('Simple drawer result:', result);
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
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
      },
      render: () => {
        return <Accordion data={accordionData} />;
      },
    });
    console.log('Dynamic drawer result:', result);
  };

  const handleDrawerWithFooter = async () => {
    const result = await openDrawer({
      title: 'Drawer with Footer',
      footerType: 'confirm_cancel',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => {
        return (
          <View>
            <Text>This drawer has a confirm/cancel footer.</Text>
            <Text>Press confirm or cancel to close the drawer.</Text>
          </View>
        );
      },
    });
    console.log('Drawer with footer result:', result);
  };

  const handleDrawerWithCustomFooter = async () => {
    const result = await openDrawer({
      title: 'Custom Footer Drawer',
      bottomSheetProps: {
        enableDynamicSizing: true,
        snapPoints: [],
        footerComponent: () => (
          <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
            <Text>This is a custom footer</Text>
            <Button onPress={() => dismissAll()}>Confirm</Button>
            <Button onPress={() => dismissAll()}>Cancel</Button>
          </View>
        ),
      },
      render: () => <Text>Drawer content with custom footer</Text>,
    });
    console.log('Custom footer drawer result:', result);
  };

  const handleNestedDrawers = async () => {
    await openDrawer({
      title: 'First Drawer',
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      render: () => (
        <View>
          <Text>This is the first drawer</Text>
          <Button
            onPress={() =>
              openDrawer({
                title: 'Second Drawer',
                bottomSheetProps: {
                  enableDynamicSizing: true,
                  stackBehavior: 'push',
                },
                render: () => <Text>This is the second drawer</Text>,
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
      <Button onPress={handleDrawerWithFooter}>
        Open Drawer with Confirm/Cancel Footer
      </Button>
      <Button onPress={handleDrawerWithCustomFooter}>
        Open Drawer with Custom Footer
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
export const WithFooter: Story = {};
export const WithCustomFooter: Story = {};
export const NestedDrawers: Story = {};
