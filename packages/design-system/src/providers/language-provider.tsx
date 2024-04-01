import { getLocales } from "expo-localization"
import React, { useEffect, useState } from "react"
import { I18nextProvider, initReactI18next } from "react-i18next"

import { useLoggerActions } from "@siteed/react-native-logger"
import i18n, { TFunction } from "i18next"
import { ActivityIndicator } from "react-native-paper"

const resources = {
  fr: {
    translations: {
      hello: "Bonjour",
    },
    select_items: {
      cancel: "Annuler",
      finish: "Terminer",
      search_placeholder: "Rechercher",
    },
    select_categories: {
      cardCount_one: "{{count}} carte",
      cardCount_other: "{{count}} cartes",
    },
    daily_sentence: {
      play: "Jouer",
    },
  },
  en: {
    translations: {
      hello: "Hello",
    },
    confirm_cancel_footer: {
      cancel: "Cancel",
      finish: "Finish",
    },
    flashcards_view: {
      totally_forgot: "Totally forgot",
      incorrect: "Incorrect",
      correct: "Correct",
      perfect_recall: "Perfect recall",
    },
    card_content: {
      play: "Play",
      audio_error: "Audio not available",
    },
    review_cards: {
      title: "FlashCards",
      subTitle: "#{{index}} [{{current}}/{{total}}] {{percent}}%",
      empty: "No cards available",
      completed_switch: "Completed cards",
    },
    review_cards_setup: {
      total_cards: "Total Cards: {{count}}",
    },
    review_cards_completion: {
      title: "Congratulations!",
      subTitle: "You have completed a new session.",
      date: "Date",
      duration: "Duration",
      total_cards: "Total Cards",
      completion: "Completion",
      next_label: "What do you want to do next?",
      restart: "Restart",
      new_session: "New Session",
    },
    updater: {
      newVersion: "New version available",
      restart: "Restart Now",
    },
    select_items: {
      cancel: "Cancel",
      finish: "Done",
      search_placeholder: "Rechercher",
      min_error: {
        one: "Please select at least {{count}} item",
        other: "Please select at least {{count}} items",
      },
      max_error: {
        one: "Please select at most {{count}} item",
        other: "Please select at most {{count}} items",
      },
    },
    select_categories: {
      cardCount_one: "{{count}} card",
      cardCount_other: "{{count}} cards",
    },
    daily_sentence: {
      play: "Play",
      audio_error: "Audio not available",
    },
  },
}


// Define a function to initialize i18n that returns a Promise
const initI18n = (): Promise<TFunction<"translation", undefined>> => {
  return i18n
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      lng: getLocales()[0]?.languageTag ?? "en",
      debug: true,
      interpolation: {
        escapeValue: false, // Not needed for React as it escapes by default
      },
    })
}

// Define the type for the props of LanguageProvider
interface LanguageProviderProps {
  children: React.ReactNode;
  locale?: string;
}


export const LanguageProvider = ({
  locale,
  children,
}: LanguageProviderProps) => {
  const { logger } = useLoggerActions("useI18nSetup")
  const [isReady, setReady] = useState(i18n.isInitialized)

  console.log(`debug language-provider locale=${locale}`)

  useEffect(() => {
    console.debug(`debug language-provider useEffect locale=${locale}`)
    if (!i18n.isInitialized) {
      const lng = locale ?? getLocales()[0]?.languageTag
      logger.info(
        `initializing i18n device: lng=${lng} system=${
          getLocales()[0]?.languageTag
        } locale=${locale}`
      )
      initI18n()
        .then(() => {
          logger.info("i18n initialized")
          setReady(true)
        })
        .catch((error) => {
          logger.error("Failed to initialize i18n:", error)
        })
    } else {
      logger.log("i18n already initialized")
    }
  }, [logger, locale])


  if (!isReady) {
    return <ActivityIndicator />
  }


  return <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
}
