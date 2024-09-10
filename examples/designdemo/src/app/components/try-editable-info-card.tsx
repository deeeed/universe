import {
  EditableInfoCard,
  ScreenWrapper,
  SelectOption,
  useModal,
} from "@siteed/design-system";
import React, { useState } from "react";
import { Card, Text } from "react-native-paper";

type EditValue = string | number | SelectOption[];

const TryEditableInfoCard = () => {
  const { editProp } = useModal();
  const [name, setName] = useState("John Doe");
  const [age, setAge] = useState(30);
  const [bio, setBio] = useState("A short bio about John Doe.");
  const [favoriteColors, setFavoriteColors] = useState<SelectOption[]>([
    { label: "Blue", value: "blue" },
    { label: "Green", value: "green" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleEdit = async <T extends EditValue>(
    currentValue: T,
    inputType: "text" | "number" | "select-button",
    setter: React.Dispatch<React.SetStateAction<T>>,
  ) => {
    const newValue = await editProp({
      data: currentValue,
      bottomSheetProps: {
        enableDynamicSizing: true,
      },
      inputType,
    });

    if (newValue !== undefined) {
      setter(newValue as T);
    }
  };

  return (
    <ScreenWrapper>
      <Card>
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
          label="Non-editable Example"
          value="This card is not editable"
          editable={false}
        />
      </Card>
    </ScreenWrapper>
  );
};

export default TryEditableInfoCard;
