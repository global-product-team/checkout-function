
import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<BlockLoyaltyExtension />, document.body);
};

function BlockLoyaltyExtension() {
  
  async function viewPoints() {
    await shopify.requireLogin();
  }

  const authenticationState = shopify.authenticationState.value;
  
  return (
    <s-section>
      <s-stack direction="inline" inline-alignment="center" gap="small-500">
        <s-text>Points earned from your purchase: </s-text>
        { 
          authenticationState === 'pre_authenticated' ? 
            <s-link onClick={viewPoints} tone="neutral">
              View rewards
            </s-link>
            : 
            <s-text>560</s-text>
        }
      </s-stack>
    </s-section>
  );
}
