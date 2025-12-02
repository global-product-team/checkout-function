import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<MenuActionItemButtonExtension />, document.body);
};

function MenuActionItemButtonExtension() {
  return <s-button>Add note</s-button>;
}
