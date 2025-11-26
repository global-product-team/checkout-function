import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useCartLines} from '@shopify/ui-extensions/checkout/preact';
import {useState, useEffect} from 'preact/hooks';

// 1. Export the extension
export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  // 현재 체크아웃에 담긴 cart line들
  const cartLines = useCartLines() || [];

  // 장바구니에 이미 담긴 variant id 목록
  const cartVariantIds = new Set(
    cartLines.map((line) => line.merchandise.id),
  );

  // shopify.query() 로 가져온 업셀 후보들 상태
  const [upsellItems, setUpsellItems] = useState([]);

  // 2. 전체 상품(또는 일부)에서 업셀 후보 가져오기
  useEffect(() => {
    let cancelled = false;

    shopify
      .query(
        `query UpsellProducts($first: Int!) {
          products(first: $first, sortKey: BEST_SELLING) {
            nodes {
              id
              title
              handle
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
        {variables: {first: 20}}, // 필요하면 개수 조절
      )
      .then(({data}) => {
        if (cancelled) return;

        const nodes = data?.products?.nodes || [];
        const items = [];

        for (const product of nodes) {
          const variant = product?.variants?.nodes?.[0];
          if (!variant) continue;

          // 이미 장바구니에 있는 variant는 제외
          if (cartVariantIds.has(variant.id)) continue;

          items.push({
            variantId: variant.id,
            title: product.title,
            // 간단히 handle을 서브텍스트로 사용 (원하면 태그/타입 등으로 교체 가능)
            subtitle: product.handle?.replace(/-/g, ' ') || '',
            priceText: formatPrice(variant.price),
          });
        }

        setUpsellItems(items);
      })
      .catch((error) => {
        console.error('Upsell products query failed:', error);
        if (!cancelled) setUpsellItems([]);
      });

    // cart 라인 개수가 바뀔 때마다 다시 계산
    // (너무 자주 돌리고 싶지 않으면 [] 로 두고 한 번만 실행해도 됨)
  }, [cartLines.length]);

  // 추천할 게 없으면 아무것도 표시하지 않음
  if (!upsellItems.length) {
    return null;
  }

  // 3. 장바구니에 상품 추가하는 함수
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

  // 디버깅용: 현재 장바구니 variant id들
  console.log('cart variant ids:', cartLines.map((line) => line.merchandise.id));

  // 4. UI 렌더링
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

// 가격 포맷 간단 처리
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
