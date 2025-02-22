import {
  EditableInfoCard,
  ScreenWrapper,
  SelectOption,
  useModal,
  useTheme,
} from "@siteed/design-system";
import React, { useState } from "react";
import { Card, Text } from "react-native-paper";

type EditValue = string | number | SelectOption[];

const TryEditableInfoCard = () => {
  const { editProp } = useModal();
  const theme = useTheme();
  const [name, setName] = useState("John Doe");
  const [age, setAge] = useState(30);
  const [bio, setBio] = useState("A short bio about John Doe.");
  const [inlineEditableBio, setInlineEditableBio] = useState(
    "This bio can be edited inline. Click to try!",
  );
  const [favoriteColors, setFavoriteColors] = useState<SelectOption[]>([
    { label: "Blue", value: "blue" },
    { label: "Green", value: "green" },
  ]);
  const [date, setDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [complexObject, setComplexObject] = useState({
    id: 1,
    details: {
      category: "test",
      tags: ["important", "demo"],
    },
    lastUpdated: new Date(),
  });

  const handleEdit = async <T extends EditValue>(
    currentValue: T,
    inputType: "text" | "number" | "select-button" | "date",
    setter: React.Dispatch<React.SetStateAction<T>>,
  ) => {
    const newValue = await editProp({
      data: currentValue,
      modalType: "drawer",
      bottomSheetProps: {
        enableDynamicSizing: true,
        keyboardBehavior: "interactive",
      },
      inputType,
    });

    if (newValue !== undefined) {
      setter(newValue as T);
    }
  };

  return (
    <ScreenWrapper>
      <Card
        contentStyle={{ gap: theme.spacing.gap, padding: theme.spacing.gap }}
      >
        <Text variant="titleLarge">EditableInfoCard Examples</Text>

        <EditableInfoCard
          label="Name"
          value={name}
          editable
          onEdit={() => handleEdit(name, "text", setName)}
        />

        <EditableInfoCard
          label="Age"
          value={age.toString()}
          editable
          onEdit={() => handleEdit(age, "number", setAge)}
        />

        <EditableInfoCard
          label="Bio"
          value={bio}
          editable
          onEdit={() => handleEdit(bio, "text", setBio)}
        />

        <EditableInfoCard
          value={date}
          label="Date"
          containerStyle={{ backgroundColor: theme.colors.surface }}
          renderValue={(value) => {
            const date = new Date(value as Date);
            const formattedDate = date.toLocaleDateString();
            return <Text>{formattedDate}</Text>;
          }}
          editable
          onEdit={async () => {
            const newDate = await editProp({
              data: new Date(date),
              inputType: "date",
              initiallyOpen: true,
              showFooter: false,
            });
            if (newDate && newDate !== date) {
              setDate(newDate as Date);
            }
          }}
        />

        <EditableInfoCard
          value={date}
          label="Time"
          containerStyle={{ backgroundColor: theme.colors.surface }}
          renderValue={(value) => {
            const date = new Date(value as Date);
            const formattedDate = date.toLocaleTimeString();
            return <Text>{formattedDate}</Text>;
          }}
          editable
          onEdit={async () => {
            const newDate = await editProp({
              data: new Date(date),
              inputType: "time",
              initiallyOpen: true,
              showFooter: false,
            });
            if (newDate && newDate !== date) {
              setDate(newDate as Date);
            }
          }}
        />

        <EditableInfoCard
          label="Inline Editable Bio"
          value={inlineEditableBio}
          inlineEditable
          onInlineEdit={(newValue) => setInlineEditableBio(newValue as string)}
        />

        <EditableInfoCard
          label="Favorite Colors"
          value={favoriteColors.map((color) => color.label).join(", ")}
          editable
          onEdit={() =>
            handleEdit(favoriteColors, "select-button", setFavoriteColors)
          }
        />

        <EditableInfoCard
          label="Processing Example"
          value="Click to simulate processing"
          editable
          processing={isProcessing}
          onEdit={async () => {
            setIsProcessing(true);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            setIsProcessing(false);
          }}
        />

        <EditableInfoCard
          label="Error Example"
          value={hasError ? "Error occurred" : "Click to simulate error"}
          editable
          error={hasError}
          onEdit={() => {
            setHasError(true);
            setTimeout(() => setHasError(false), 2000);
          }}
        />

        <EditableInfoCard
          label="Complex Object"
          value={JSON.stringify(complexObject, null, 2)}
          editable
          onEdit={async () => {
            const newValue = await editProp({
              data: JSON.stringify(complexObject, null, 2),
              modalType: "drawer",
              inputType: "text",
              bottomSheetProps: {
                enableDynamicSizing: true,
                keyboardBehavior: "interactive",
              },
            });

            if (newValue) {
              try {
                const parsedValue = JSON.parse(newValue as string);
                setComplexObject(parsedValue);
              } catch (error) {
                // Handle invalid JSON input
                console.error("Invalid JSON input");
              }
            }
          }}
        />

        <EditableInfoCard
          label="Non-editable Example"
          value="This card is not editable"
          editable={false}
        />
      </Card>
    </ScreenWrapper>
  );
};

export default TryEditableInfoCard;
