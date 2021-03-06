// ES6 Symbol Polyfill for IE11
import 'es6-symbol/implement';
import 'es6-promise/auto';
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { useStrict } from 'mobx';
import { Provider } from 'mobx-react';
import 'availity-uikit/scss/_bootstrap.scss';
import './index.scss';
import App from './App';
import { appStore, stateStore } from './stores';

const stores = { appStore, stateStore };
useStrict(true);

const render = Component =>
  // eslint-disable-next-line react/no-render-return-value
  ReactDOM.render(
    <AppContainer>
      <Provider {...stores}>
        <Component />
      </Provider>
    </AppContainer>,
    document.getElementById('root')
  );

// Hot Module Replacement API
if (__DEV__ && module.hot) {
  module.hot.accept('./App', () => render(App));
}

if (!__TEST__) {
  render(App);
}
