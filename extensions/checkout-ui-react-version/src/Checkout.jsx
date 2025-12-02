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
      <s-text size="large" emphasis="bold">
        함께 구매하면 좋은 상품
      </s-text>
      <s-box padding="base" />

      <s-box
        padding="large"
        background="subdued"
        borderRadius="base"
        padding="base"
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
              <s-box key={node.id} padding="base" borderRadius="base">
                <s-stack direction="horizontal" gap="tight" blockAlignment="center">
                  {imageUrl && (
                    <s-image
                      src={imageUrl}
                      aria-label={altText}
                      inlineSize="40px"
                    />
                  )}

                  {/* 옵션 선택 */}
                  <s-select
                    label="옵션 선택"
                    onChange={(e) =>
                      handleVariantChange(productId, e.target.value)
                    }
                  >
                    {variants.map((v) => (
                      <s-option
                        key={v.id}
                        value={v.id}
                        defaultSelected={v.id === defaultVariant.id}
                      >
                        {v.title} /{" "}
                        {parseFloat(v.price.amount).toLocaleString()}{" "}
                        {v.price.currencyCode}
                      </s-option>
                    ))}
                  </s-select>

                  <s-text emphasis="bold">{node.title}</s-text>
                </s-stack>

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
                    <s-box
                      direction="inline"
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="flex-start"
                      gap="base"
                    >
                      <s-button 
                        size="small"
                        kind="secondary"
                        onClick={() => decreaseQuantity(selectedVariantId)}
                      >
                        -
                      </s-button>

                      <s-text>{getCartQuantity(selectedVariantId)}</s-text>

                      <s-button 
                        size="small"
                        kind="secondary"
                        onClick={() => increaseQuantity(selectedVariantId)}
                        disabled={!selectedVariant?.availableForSale}
                      >
                        +
                      </s-button>
                    </s-box>
                  ) : (
                    /*  품절 UI 처리 */
                    <s-button
                      kind="primary"
                      size="small"
                      disabled={!selectedVariant?.availableForSale}
                      onClick={() => addToCart(selectedVariantId)}
                    >
                      {selectedVariant?.availableForSale ? "+ 추가" : "품절"}
                    </s-button>
                  )}

              </s-box>
            );
          })}
        </s-stack>
      </s-box>
    </s-box>
  );
}
