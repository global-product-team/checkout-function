import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default function extension() {
  render(<ThankYou />, document.body);
}

function ThankYou() {
  return (
    <s-banner tone="success" heading="테스트 배너">
      Thank you page 에서 나와야 하는 테스트 문구입니다.
      <s-link href="/products/essential-cropped-long-sleeve?variant=51370566975771">네이버</s-link>

    </s-banner>
  );
}
