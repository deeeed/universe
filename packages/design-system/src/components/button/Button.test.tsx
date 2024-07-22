import * as React from 'react';

import { render } from '@testing-library/react-native';
import { Button } from './Button';

it('renders text button by default', () => {
  const tree = render(<Button>Text Button</Button>).toJSON();

  expect(tree).toMatchSnapshot();
});
