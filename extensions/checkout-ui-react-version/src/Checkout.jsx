import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useCartLines } from "@shopify/ui-extensions/checkout/preact";
 
export default function extension() {
  render(<Extension />, document.body);
}
 
function Extension() {
  const cartLines = useCartLines();
  const [recommend, setRecommend] = useState([]);
  const [loading, setLoading] = useState(false);
 
  //  선택된 variant state
  const [selectedVariants, setSelectedVariants] = useState({});
 
  useEffect(() => {
    if (!cartLines || cartLines.length === 0) return;
 
    const firstLine = cartLines[0];
    const productId = firstLine.merchandise.product.id;
 
    const queryProductTags = `
      query($id: ID!) {
        product(id: $id) {
          id
          title
          tags
          handle
        }
      }
    `;
 
    setLoading(true);
    shopify
      .query(queryProductTags, { variables: { id: productId } })
      .then(({ data }) => {
        const tags = data?.product?.tags || [];
        if (!tags.length) {
          setLoading(false);
          return;
        }
 
        const mainTag = tags[0];
        fetchRelatedProducts(mainTag);
      })
      .catch(() => setLoading(false));
  }, [cartLines]);
 
  //  연관 상품 조회
  function fetchRelatedProducts(tag) {
    const queryRec = `
      query($tag: String!) {
        products(first: 10, query: $tag) {
          nodes {
            id
            title
            featuredImage {
              url
              altText
            }
            variants(first: 50) {
              nodes {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    `;
 
    shopify
      .query(queryRec, { variables: { tag } })
      .then(({ data }) => {
        setRecommend(data.products.nodes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }
 
  //  장바구니에 해당 variant 존재 여부
  function isInCart(variantId) {
    return cartLines.some((line) => line.merchandise.id === variantId);
  }
 
  //  cart lineId 가져오기
  function getCartLineId(variantId) {
    return cartLines.find((line) => line.merchandise.id === variantId)?.id;
  }
 
  //  현재 장바구니 수량 가져오기
  function getCartQuantity(variantId) {
    const line = cartLines.find((l) => l.merchandise.id === variantId);
    return line?.quantity ?? 0;
  }
 
  //  qty 증가
  async function increaseQuantity(variantId) {
    const lineId = getCartLineId(variantId);
    if (!lineId) return;
 
    try {
      await shopify.applyCartLinesChange({
        type: "updateCartLine",
        id: lineId,
        quantity: getCartQuantity(variantId) + 1,
      });
    } catch (e) {
      console.error("수량 증가 실패:", e);
    }
  }
 
  //  qty 감소 (0이면 삭제)
  async function decreaseQuantity(variantId) {
    const lineId = getCartLineId(variantId);
    if (!lineId) return;
 
    const current = getCartQuantity(variantId);
    const newQty = current - 1;
 
    try {
      if (newQty <= 0) {
        await shopify.applyCartLinesChange({
          type: "removeCartLine",
          id: lineId,
          quantity: current,
        });
      } else {
        await shopify.applyCartLinesChange({
          type: "updateCartLine",
          id: lineId,
          quantity: newQty,
        });
      }
    } catch (e) {
      console.error("수량 감소 실패:", e);
    }
  }
 
  //  장바구니에 없을 때 최초 추가
  async function addToCart(variantId) {
    try {
      await shopify.applyCartLinesChange({
        type: "addCartLine",
        merchandiseId: variantId,
        quantity: 1,
      });
    } catch (error) {
      console.error("추가 실패:", error);
    }
  }
 
  //  옵션 변경
  function handleVariantChange(productId, variantId) {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  }
 
  if (loading) {
    return (
      <s-box padding="base">
        <s-text appearance="subdued">추천 상품을 불러오는 중...</s-text>
      </s-box>
    );
  }
 
  if (!recommend.length) return null;
 
  return (
    <s-box border="none">
      <s-box padding="base" />
      <s-heading size="large" emphasis="bold">
        Frequently Bought Together
      </s-heading>
      <s-box padding="base" />
 
      <s-box
        padding="large"
        background="subdued"
        borderRadius="base"
        padding="base"
      >
        <s-scroll-box 
            direction="horizontal" 
            maxInlineSize="100%" 
            maxBlockSize="200px"
            padding="none"
          >
            <s-stack spacing="base" direction="inline">
              {recommend.map((node) => {
                const productId = node.id;
                const variants = node.variants.nodes;
                const defaultVariant = variants[0];
    
                const selectedVariantId =
                  selectedVariants[productId] || defaultVariant.id;
    
                const selectedVariant = variants.find(
                  (v) => v.id === selectedVariantId
                );
    
                const imageUrl =
                  selectedVariant?.image?.url || node.featuredImage?.url;
    
                const altText =
                  selectedVariant?.image?.altText || node.title;
    
                return (
                  <s-grid gridTemplateColumns="auto auto" gap="base" key={node.id} padding="base" borderRadius="base">
                    <s-grid gridTemplateColumns="auto auto" gap="tight" blockAlignment="center">
                      {imageUrl && (
                        <s-product-thumbnail
                          src={imageUrl}
                          aria-label={altText}
                          inlineSize="fill"
                        />
                      )}

                      <s-box>
                          <s-text emphasis="bold">{node.title}</s-text>
                          {/* 옵션 선택 */}
                                  <s-select
                                    label="Select an option"
                                    onChange={(e) => handleVariantChange(productId, e.target.value)}
                                  >
                                    {variants.map((v) => {
                                      const priceText = `${parseFloat(v.price.amount).toLocaleString()} ${v.price.currencyCode}`;
                                      const isSoldOut = !v.availableForSale;

                                      return (
                                        <s-option
                                          key={v.id}
                                          value={v.id}
                                          defaultSelected={v.id === defaultVariant.id}
                                        >
                                          {v.title} / {priceText}
                                          {isSoldOut ? "(Sold out)" : ""}
                                        </s-option>
                                      );
                                    })}
                                  </s-select>

                      </s-box>
                
            
                    </s-grid>
    
                    <s-stack>
                                  {/* 가격 */}
                        {selectedVariant?.price && (
                          <s-text appearance="accent" size="small">
                            {parseFloat(selectedVariant.price.amount).toLocaleString()}{" "}
                            {selectedVariant.price.currencyCode}
                          </s-text>
                        )}
        
                        {/*  수량 조절 UI or 추가 버튼 */}
                          {isInCart(selectedVariantId) ? (
                            /* 수량 조절 UI */
                              <s-grid gridTemplateColumns="auto auto auto" >
                                <s-grid-item>
                                  <s-button
                                    size="small"
                                    kind="secondary"
                                    onClick={() => decreaseQuantity(selectedVariantId)}
                                  >
                                    -
                                  </s-button>
                                </s-grid-item>

                                <s-grid-item >
                                  <s-heading level="4">{getCartQuantity(selectedVariantId)}</s-heading>
                                </s-grid-item>

                                <s-grid-item>
                                  <s-button
                                    size="small"
                                    kind="secondary"
                                    onClick={() => increaseQuantity(selectedVariantId)}
                                    disabled={!selectedVariant?.availableForSale}
                                  >
                                    +
                                  </s-button>
                                </s-grid-item>
                              </s-grid>



                          ) : (
                            /*  Sold out UI 처리 */
                            <s-button
                              kind="primary"
                              size="small"
                              disabled={!selectedVariant?.availableForSale}
                              onClick={() => addToCart(selectedVariantId)}
                            >
                              {selectedVariant?.availableForSale ? "+ 추가" : "Sold out"}
                            </s-button>
                          )}
                    </s-stack>
                  </s-grid>
                );
              })}
            </s-stack>
        </s-scroll-box>
      </s-box>
    </s-box>
  );
}
 