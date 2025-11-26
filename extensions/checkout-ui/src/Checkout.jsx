// import '@shopify/ui-extensions/preact';
// import {render} from 'preact';
// import {useEffect, useState} from 'preact/hooks';
 
// export default function extension() {
//   render(<Extension />, document.body);
// }
 
// function Extension() {
//   const [data, setData] = useState();
 
//   useEffect(() => {
//     shopify
//       .query(
//         `query ($first: Int!) {
//           products(first: $first) {
//             nodes {
//               id
//               title
//               variants(first: 1) {
//                 nodes {
//                   id
//                 }
//               }
//             }
//           }
//         }`,
//         {variables: {first: 5}},
//       )
//       .then(({data}) => setData(data))
//       .catch(console.error);
//   }, []);
 
//   async function addToCart(variantId) {
//     const result = await shopify.applyCartLinesChange({
//       type: "addCartLine",
//       merchandiseId: variantId,
//       quantity: 1,
//     });
 
//     console.log("Add to cart result:", result);
//   }
 
//   return (
//     <s-unordered-list>
//       {data?.products?.nodes.map((node) => (
//         <s-list-item key={node.id}>
//           <s-stack direction="horizontal" gap="base">
//             <s-text>{node.title}</s-text>
//             <s-button
//               onClick={() =>
//                 addToCart(node.variants.nodes[0].id)
//               }
//             >
//               장바구니 추가
//             </s-button>
//           </s-stack>
//         </s-list-item>
//       ))}
//     </s-unordered-list>
//   );
// }
 

import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useCartLines} from '@shopify/ui-extensions/checkout/preact';
 
// 1. Export the extension
export default function extension() {
  render(<Extension />, document.body);
}
 
function Extension() {
  // 2. 현재 체크아웃에 담긴 cart line들
  const cartLines = useCartLines() || [];
 
  // 장바구니에 이미 담긴 variant id 목록
  const cartVariantIds = new Set(
    cartLines.map((line) => line.merchandise.id),
  );
 
  // 3. 업셀 후보 상품들 정의
  //  → 여기만 실제 상품 정보로 교체하면 됨
  const upsellCandidates = [
    {
      // 실제 Variant GID로 교체
      // 예: "gid://shopify/ProductVariant/1234567890"
      variantId: 'gid://shopify/ProductVariant/51366102860059',
      title: 'Super-High-Rise',
      subtitle: 'Super-High-Rise 도 사라사~!',
      priceText: '$2,000.00',
    },
    {
      variantId: 'gid://shopify/ProductVariant/51366142345499',
      title: 'Layered Bra',
      subtitle: '추천템 브라~~',
      priceText: '$3,000.00',
    },
    {
      variantId: 'gid://shopify/ProductVariant/51366142542107',
      title: 'Legging 25"',
      subtitle: '레깅수',
      priceText: '$500.00',
    },
  ];
 
  // 이미 장바구니에 있는 variant는 추천에서 제외
  const upsellItems = upsellCandidates.filter(
    (item) => !cartVariantIds.has(item.variantId),
  );
 
  // 추천할 게 없으면 아무것도 표시하지 않음
  if (upsellItems.length === 0) {
    return null;
  }
 
  // 4. 장바구니에 상품 추가하는 함수
  async function handleAddToCart(variantId) {
    const result = await shopify.applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });
 
    if (result.type === 'error') {
      // 최소한 콘솔에만 에러 찍어두기
      console.error('Failed to add upsell item:', result.message);
    }
  }
console.log(cartLines.map((line) => line.merchandise.id));
  // 5. UI 렌더링
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
              <s-text size="small" appearance="subdued">
                {item.subtitle}
              </s-text>
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