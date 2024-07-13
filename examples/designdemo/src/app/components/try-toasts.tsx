import { Button, ScreenWrapper, useToast } from "@siteed/design-system";

const ToastPage = () => {
  const { show, hide, loader } = useToast();

  return (
    <ScreenWrapper>
      <Button
        onPress={() => {
          show({
            message: "You have succeeded!",
            iconVisible: true,
            type: "success",
          });
        }}
      >
        Success Toaster
      </Button>

      <Button onPress={() => loader("Loading...", { position: "middle" })}>
        Loading Toaster
      </Button>

      <Button
        onPress={() => {
          hide();
        }}
      >
        Hide All
      </Button>
    </ScreenWrapper>
  );
};

export default ToastPage;
