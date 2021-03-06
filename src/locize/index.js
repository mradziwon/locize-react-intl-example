import React, { Component } from 'react';
import { FormattedMessage as FM, FormattedHTMLMessage as FHM, IntlProvider as IP, addLocaleData } from 'react-intl';
import locizer from 'locizer';
import locizeEditor from 'locize-editor';

const IS_DEV = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const DEFAULTNAMESPACE = 'common'; // the translation file to use
const PROJECTID = 'da028c03-435a-4587-af3a-086de8c7bd9b'; // your project id
const APIKEY = 'ENTER_YOUR_API_KEY_FOR_SAVE_MISSING';
const REFERENCELANGUAGE = 'en';
const FALLBACKLANGUAGE = 'en';
const SAVE_NEW_VALUES = true; // should send newly added react-intl Formatted(HRML)Message to locize
const UPDATE_VALUES = true; // should update on locize if value changes in code
const PRIVATE = false; // private publish

locizer
  .init({
    fallbackLng: FALLBACKLANGUAGE,
    referenceLng: REFERENCELANGUAGE,
    projectId: PROJECTID,
    apiKey: APIKEY,
  });

const translations = {};
let currentLocale;

const LocizeContext = React.createContext({
  locale: null,
  namespace: null
});

export class IntlProvider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locale: null,
      messages: {}
    };
  }

  componentDidMount() {
    const namespace = this.props.namespace || DEFAULTNAMESPACE;

    // return if already loaded
    if (currentLocale && translations[currentLocale] && translations[currentLocale][namespace]) return;

    // load the given file form locize and detect language while doing so
    locizer.load(namespace, (err, messages, locale) => {
      currentLocale = locale;
      translations[locale] = messages;

      // load react intl locale data
      import('react-intl/locale-data/' + locale)
        .then(localeData => {
          addLocaleData(localeData);

          // update state to render children
          this.setState({
            locale,
            messages
          });
        });

      // init editor if development
      if (IS_DEV) {
        // init incontext editor
        locizeEditor.init({
          lng: locale,
          defaultNS: DEFAULTNAMESPACE,
          referenceLng: REFERENCELANGUAGE,
          projectId: PROJECTID,
          private: PRIVATE
        })
      }
    });
  }

  render() {
    const { children, namespace } = this.props;
    const { locale, messages } = this.state;

    if (!locale) return null; // we wait for render until loaded

    // render the react-intl IntlProvider with loaded messages
    return (
      <LocizeContext.Provider value={{ locale, namespace: namespace || DEFAULTNAMESPACE }}>
        <IP locale={locale} messages={messages}>
          {children}
        </IP>
      </LocizeContext.Provider>
    );
  }
}

// hoc for context
function withContext() {
  return function Wrapper(WrappedComponent) {

    class WithContext extends Component {
      render() {
        return (
          <LocizeContext.Consumer>
            {
              ctx => (
                <WrappedComponent {...this.props} locale={ctx.locale} namespace={ctx.namespace} />
              )
            }
          </LocizeContext.Consumer>
        )
      }
    }

    return WithContext;
  }
}

// a hoc to extend components with locize features
function supportLocize() {
  return function Wrapper(WrappedComponent) {

    class LocizeExtension extends Component {
      constructor(props, context) {
        super(props, context);

        const { id, defaultMessage, description, namespace } = props;

        // get current value in message catalog
        const currentValue = translations[currentLocale] && translations[currentLocale][namespace] && translations[currentLocale][namespace][id]

        // depeding on not yet exists or changed
        // save or update the value on locize
        if (SAVE_NEW_VALUES && !currentValue) {
          locizer.add(namespace, id, defaultMessage, description);
        } else if (UPDATE_VALUES && currentValue !== defaultMessage) {
          locizer.update(namespace, id, defaultMessage, description)
        }

        // send last used information
        locizer.used(namespace, id);
      }

      render() {
        return <WrappedComponent {...this.props} />
      }
    }

    return withContext()(LocizeExtension);
  }
}

// if is development environment we export extended react-intl components
export const FormattedMessage = IS_DEV ? supportLocize()(FM) : FM;
export const FormattedHTMLMessage = IS_DEV ? supportLocize()(FHM) : FHM;
