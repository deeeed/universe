import { getLocales } from 'expo-localization';
import React, { useEffect } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { useLoggerActions } from '@siteed/react-native-logger';
import i18n from 'i18next';

const resources = {
  fr: {
    translations: {
      hello: 'Bonjour',
    },
    select_items: {
      cancel: 'Annuler',
      finish: 'Terminer',
      search_placeholder: 'Rechercher',
    },
    select_categories: {
      cardCount_one: '{{count}} carte',
      cardCount_other: '{{count}} cartes',
    },
    daily_sentence: {
      play: 'Jouer',
    },
  },
  en: {
    translations: {
      hello: 'Hello',
    },
    confirm_cancel_footer: {
      cancel: 'Cancel',
      finish: 'Finish',
    },
    flashcards_view: {
      totally_forgot: 'Totally forgot',
      incorrect: 'Incorrect',
      correct: 'Correct',
      perfect_recall: 'Perfect recall',
    },
    card_content: {
      play: 'Play',
      audio_error: 'Audio not available',
    },
    review_cards: {
      title: 'FlashCards',
      subTitle: '#{{index}} [{{current}}/{{total}}] {{percent}}%',
      empty: 'No cards available',
      completed_switch: 'Completed cards',
    },
    review_cards_setup: {
      total_cards: 'Total Cards: {{count}}',
    },
    review_cards_completion: {
      title: 'Congratulations!',
      subTitle: 'You have completed a new session.',
      date: 'Date',
      duration: 'Duration',
      total_cards: 'Total Cards',
      completion: 'Completion',
      next_label: 'What do you want to do next?',
      restart: 'Restart',
      new_session: 'New Session',
    },
    updater: {
      newVersion: 'New version available',
      restart: 'Restart Now',
    },
    select_items: {
      cancel: 'Cancel',
      finish: 'Done',
      search_placeholder: 'Rechercher',
      min_error: {
        one: 'Please select at least {{count}} item',
        other: 'Please select at least {{count}} items',
      },
      max_error: {
        one: 'Please select at most {{count}} item',
        other: 'Please select at most {{count}} items',
      },
    },
    select_categories: {
      cardCount_one: '{{count}} card',
      cardCount_other: '{{count}} cards',
    },
    daily_sentence: {
      play: 'Play',
      audio_error: 'Audio not available',
    },
  },
};

export const LanguageProvider = ({
  locale,
  children,
}: {
  children: React.ReactNode;
  locale?: string;
}) => {
  const { logger } = useLoggerActions('useI18nSetup');

  useEffect(() => {
    if (!i18n.isInitialized) {
      const lng = locale ?? getLocales()[0]?.languageTag;
      logger.info(
        `initializing i18n device: lng=${lng} system=${
          getLocales()[0]?.languageTag
        } locale=${locale}`
      );
      i18n
        .use(initReactI18next)
        .init({
          fallbackLng: 'en',
          debug: true,
          resources,
          // saveMissingTo: 'all',
          lng,
          defaultNS: 'translations',
          interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
          },
        })
        .then((t) => {
          logger.log('i18n initialized', t('hello'));
        })
        .catch((error) => {
          logger.error('Failed to initialize i18n:', error);
        });
    } else {
      logger.log('i18n already initialized');
    }
  }, [logger, locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
