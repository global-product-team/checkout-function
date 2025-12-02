import '@shopify/ui-extensions/preact';
import {render} from 'preact';
 
export default function extension() {
  render(<ThankYou />, document.body);
}
 
function ThankYou() {
  return (
     <s-link href="https://www.stretchyourstory.com/account/register?#signupform">
          <s-image
            src="https://cdn.shopify.com/s/files/1/0888/0835/8258/files/image_806.png?v=1764118089"
            aria-label="Signup Link Image"
            totalItems={1}
            inlineSize="40px"   
          />
    </s-link>
  );
}
 
 