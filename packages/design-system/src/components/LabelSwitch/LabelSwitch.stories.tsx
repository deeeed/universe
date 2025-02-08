import type { Meta, StoryObj } from '@storybook/react';
import { MaterialIcons } from '@expo/vector-icons';
import { LabelSwitch, LabelSwitchProps } from './LabelSwitch';
import { View } from 'react-native';
import React from 'react';
const LabelSwitchMeta: Meta<typeof LabelSwitch> = {
  component: LabelSwitch,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'boolean' },
    onValueChange: { action: 'switched' },
    containerStyle: { control: 'object' },
    labelStyle: { control: 'object' },
  },
  args: {
    label: 'Subscribe to notifications',
    value: false,
    onValueChange: () => {},
  },
};

export default LabelSwitchMeta;

export const Primary: StoryObj<LabelSwitchProps> = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: '<LabelSwitch label="Subscribe to notifications" value={false} onValueChange={() => {}} />',
      },
    },
  },
};

export const WithIcon: StoryObj<LabelSwitchProps> = {
  args: {
    icon: <MaterialIcons name="notifications" size={24} color="#666" />,
    label: 'Notifications',
  },
  parameters: {
    docs: {
      source: {
        code: `
<LabelSwitch 
  label="Notifications" 
  value={false} 
  onValueChange={() => {}}
  icon={<MaterialIcons name="notifications" size={24} color="#666" />}
/>`,
      },
    },
  },
};

export const WithCustomStyles: StoryObj<LabelSwitchProps> = {
  args: {
    containerStyle: {
      backgroundColor: '#f0f0f0',
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    labelStyle: {
      fontWeight: 'bold',
      color: '#6200ea',
      fontSize: 16,
    },
    icon: <MaterialIcons name="dark-mode" size={24} color="#6200ea" />,
    label: 'Dark Mode',
  },
  parameters: {
    docs: {
      source: {
        code: `
<LabelSwitch 
  label="Dark Mode" 
  value={false} 
  onValueChange={() => {}}
  containerStyle={{ 
    backgroundColor: '#f0f0f0', 
    padding: 20, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  }} 
  labelStyle={{ 
    fontWeight: 'bold', 
    color: '#6200ea',
    fontSize: 16,
  }}
  icon={<MaterialIcons name="dark-mode" size={24} color="#6200ea" />}
/>`,
      },
    },
  },
};

export const Disabled: StoryObj<LabelSwitchProps> = {
  args: {
    value: true,
    disabled: true,
    onValueChange: () => {},
    icon: <MaterialIcons name="block" size={24} color="#999" />,
    label: 'Disabled Switch',
  },
  parameters: {
    docs: {
      source: {
        code: `
<LabelSwitch 
  label="Disabled Switch" 
  value={true} 
  disabled={true}
  onValueChange={() => {}} 
  icon={<MaterialIcons name="block" size={24} color="#999" />}
/>`,
      },
    },
  },
};

// Example showing multiple switches with different configurations
export const Examples: StoryObj<LabelSwitchProps> = {
  render: () => (
    <View style={{ gap: 16 }}>
      <LabelSwitch
        label="Basic Switch"
        value={false}
        onValueChange={() => {}}
      />
      <LabelSwitch
        label="With Icon"
        value={true}
        onValueChange={() => {}}
        icon={<MaterialIcons name="wifi" size={24} color="#666" />}
      />
      <LabelSwitch
        label="Custom Style"
        value={false}
        onValueChange={() => {}}
        containerStyle={{
          backgroundColor: '#e3f2fd',
          borderRadius: 8,
          padding: 16,
        }}
        labelStyle={{
          color: '#1976d2',
          fontWeight: 'bold',
        }}
        icon={<MaterialIcons name="settings" size={24} color="#1976d2" />}
      />
    </View>
  ),
  parameters: {
    docs: {
      source: {
        code: `
// Multiple switches with different configurations
<View style={{ gap: 16 }}>
  <LabelSwitch
    label="Basic Switch"
    value={false}
    onValueChange={() => {}}
  />
  <LabelSwitch
    label="With Icon"
    value={true}
    onValueChange={() => {}}
    icon={<MaterialIcons name="wifi" size={24} color="#666" />}
  />
  <LabelSwitch
    label="Custom Style"
    value={false}
    onValueChange={() => {}}
    containerStyle={{
      backgroundColor: '#e3f2fd',
      borderRadius: 8,
      padding: 16,
    }}
    labelStyle={{
      color: '#1976d2',
      fontWeight: 'bold',
    }}
    icon={<MaterialIcons name="settings" size={24} color="#1976d2" />}
  />
</View>`,
      },
    },
  },
};
