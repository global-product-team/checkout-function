import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useCartLines} from '@shopify/ui-extensions/checkout/preact';
import {useState, useEffect} from 'preact/hooks';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const cartLines = useCartLines() || [];

  const cartVariantIds = new Set(
    cartLines.map((line) => line.merchandise.id),
  );

  const [upsellItems, setUpsellItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    shopify
      .query(
        `query UpsellProducts($first: Int!) {
          products(
            first: $first
            query: "tag:bestseller"
          ) {
            nodes {
              id
              title
              handle
              featuredImage {
                url
                altText
              }
              variants(first: 1) {
                nodes {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }`,
        {variables: {first: 20}},
      )
      .then(({data}) => {
        if (cancelled) return;

        const nodes = data?.products?.nodes || [];
        const items = [];

        for (const product of nodes) {
          const variant = product?.variants?.nodes?.[0];
          if (!variant) continue;

          if (cartVariantIds.has(variant.id)) continue;

          const image = product.featuredImage;

          items.push({
            variantId: variant.id,
            title: product.title,
            subtitle: product.handle?.replace(/-/g, ' ') || '',
            priceText: formatPrice(variant.price),
            imageUrl: image?.url || '',
            imageAlt: image?.altText || product.title,
          });
        }

        setUpsellItems(items);
      })
      .catch((error) => {
        console.error('Upsell products query failed:', error);
        if (!cancelled) setUpsellItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [cartLines.length]);

  if (!upsellItems.length) {
    return null;
  }

  async function handleAddToCart(variantId) {
    const result = await shopify.applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });

    if (result.type === 'error') {
      console.error('Failed to add upsell item:', result.message);
    } else {
      console.log('Add to cart result:', result);
    }
  }

  console.log(
    'cart variant ids:',
    cartLines.map((line) => line.merchandise.id),
  );

  return (
    <s-banner tone="info" heading="이 상품도 함께 많이 담으셨어요">
      <s-stack direction="block" gap="base">
        {upsellItems.slice(0, 2).map((item) => (
          <s-stack
            key={item.variantId}
            direction="inline"
            gap="base"
            inlineAlignment="space-between"
            blockAlignment="center"
          >
            <s-stack direction="inline" gap="base" blockAlignment="center">
              {item.imageUrl && (
                <s-product-thumbnail
                  src={item.imageUrl}
                  totalItems={1}
                  aria-label={item.imageAlt}
                ></s-product-thumbnail>
              )}

              <s-stack direction="block" gap="none">
                <s-text size="medium" emphasis="bold">
                  {item.title}
                </s-text>
                {item.subtitle ? (
                  <s-text size="small" appearance="subdued">
                    {item.subtitle}
                  </s-text>
                ) : null}
                <s-text size="small">{item.priceText}</s-text>
              </s-stack>
            </s-stack>

            <s-button
              variant="primary"
              onClick={() => handleAddToCart(item.variantId)}
            >
              장바구니에 추가
            </s-button>
          </s-stack>
        ))}
      </s-stack>
    </s-banner>
  );
}

function formatPrice(price) {
  if (!price) return '';
  const amount = Number(price.amount);
  if (Number.isNaN(amount)) return `${price.amount} ${price.currencyCode || ''}`;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: price.currencyCode || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${price.currencyCode || ''}`;
  }
}
