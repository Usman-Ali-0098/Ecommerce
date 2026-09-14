import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

type InvoiceItem = {
  productName: string;
  sku: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type OrderInvoiceEmailProps = {
  customerName: string;
  orderNumber: string;
  paidAt: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

function money(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}

export default function OrderInvoiceEmail({
  customerName,
  orderNumber,
  paidAt,
  items,
  subtotal,
  tax,
  total,
  shippingAddress,
}: OrderInvoiceEmailProps) {
  const addressLine = [
    shippingAddress.address,
    shippingAddress.city,
    shippingAddress.postalCode,
    shippingAddress.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Html lang="en">
      <Head />

      <Preview>Invoice for order {orderNumber}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>BudgetVibe</Text>
          </Section>

          <Section style={styles.content}>
            <Heading style={styles.heading}>Payment Received</Heading>

            <Text style={styles.text}>Hello {customerName},</Text>

            <Text style={styles.text}>
              Thanks for your order. Here is your invoice for order{" "}
              <strong>{orderNumber}</strong>, paid on{" "}
              {paidAt.toLocaleDateString("en-PK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              .
            </Text>

            <Hr style={styles.divider} />

            {items.map((item, index) => (
              <Row key={index} style={styles.itemRow}>
                <Column>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemMeta}>
                    SKU: {item.sku}
                    {item.colorName ? ` · ${item.colorName}` : ""}
                    {item.sizeName ? ` · ${item.sizeName}` : ""} · Qty{" "}
                    {item.quantity}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={styles.itemPrice}>{money(item.lineTotal)}</Text>
                </Column>
              </Row>
            ))}

            <Hr style={styles.divider} />

            <Row>
              <Column>
                <Text style={styles.summaryLabel}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={styles.summaryValue}>{money(subtotal)}</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={styles.summaryLabel}>Tax</Text>
              </Column>
              <Column align="right">
                <Text style={styles.summaryValue}>{money(tax)}</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={styles.totalLabel}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={styles.totalValue}>{money(total)}</Text>
              </Column>
            </Row>

            {addressLine ? (
              <>
                <Hr style={styles.divider} />
                <Text style={styles.secondaryText}>
                  Shipping to {shippingAddress.name ?? customerName}
                  <br />
                  {addressLine}
                </Text>
              </>
            ) : null}
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Keep this email for your records.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: "0",
    padding: "20px 10px",
    backgroundColor: "#f7f9fb",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
  },
  header: {
    padding: "14px 20px",
    backgroundColor: "#087ff5",
    textAlign: "center" as const,
  },
  brand: {
    margin: "0",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.2px",
  },
  content: {
    padding: "24px 24px 20px",
  },
  heading: {
    margin: "0 0 18px",
    color: "#111827",
    fontSize: "20px",
    fontWeight: "600",
    lineHeight: "1.25",
    textAlign: "center" as const,
  },
  text: {
    margin: "0 0 12px",
    color: "#374151",
    fontSize: "13px",
    lineHeight: "1.55",
  },
  divider: {
    margin: "14px 0",
    borderColor: "#e5e7eb",
  },
  itemRow: {
    marginBottom: "8px",
  },
  itemName: {
    margin: "0",
    color: "#111827",
    fontSize: "12px",
    fontWeight: "600",
  },
  itemMeta: {
    margin: "2px 0 0",
    color: "#9ca3af",
    fontSize: "10px",
  },
  itemPrice: {
    margin: "0",
    color: "#374151",
    fontSize: "12px",
  },
  summaryLabel: {
    margin: "2px 0",
    color: "#6b7280",
    fontSize: "11px",
  },
  summaryValue: {
    margin: "2px 0",
    color: "#374151",
    fontSize: "11px",
  },
  totalLabel: {
    margin: "6px 0 0",
    color: "#111827",
    fontSize: "13px",
    fontWeight: "700",
  },
  totalValue: {
    margin: "6px 0 0",
    color: "#111827",
    fontSize: "13px",
    fontWeight: "700",
  },
  secondaryText: {
    margin: "0",
    color: "#6b7280",
    fontSize: "11px",
    lineHeight: "1.5",
  },
  footer: {
    padding: "12px 18px",
    backgroundColor: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    margin: "0",
    color: "#9ca3af",
    fontSize: "9px",
    lineHeight: "1.4",
    textAlign: "center" as const,
  },
};
