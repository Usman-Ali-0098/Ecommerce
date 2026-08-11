import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type PasswordResetEmailProps = {
  fullName: string;
  resetUrl: string;
};

export default function PasswordResetEmail({
  fullName,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <Html lang="en">
      <Head />

      <Preview>
        Reset your password. Link expires in 1 minute.
      </Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}

          <Section style={styles.header}>
            <Text style={styles.brand}>
              SASTAPAK
            </Text>
          </Section>

          {/* Content */}

          <Section style={styles.content}>
            <Heading style={styles.heading}>
              Reset Password
            </Heading>

            <Text style={styles.text}>
              Hello {fullName},
            </Text>

            <Text style={styles.text}>
              Click the button below to reset your password.
            </Text>

            <Section style={styles.buttonWrapper}>
              <Button
                href={resetUrl}
                style={styles.button}
              >
                Reset Password
              </Button>
            </Section>

            <Text style={styles.notice}>
              This link expires in 1 minute and can only be used once.
            </Text>

            <Text style={styles.secondaryText}>
              If you did not request this, you can ignore this email.
            </Text>

            <Hr style={styles.divider} />

            <Text style={styles.fallbackText}>
              Button not working? Use this link:
            </Text>

            <Link
              href={resetUrl}
              style={styles.link}
            >
              {resetUrl}
            </Link>
          </Section>

          {/* Footer */}

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Automated security email — do not share this link.
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
    maxWidth: "460px",

    margin: "0 auto",

    overflow: "hidden",

    backgroundColor: "#ffffff",

    border: "1px solid #e5e7eb",
    borderRadius: "7px",
  },

  header: {
    padding: "14px 20px",

    backgroundColor: "#087ff5",

    textAlign:
      "center" as const,
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

    textAlign:
      "center" as const,
  },

  text: {
    margin: "0 0 12px",

    color: "#374151",

    fontSize: "13px",

    lineHeight: "1.55",
  },

  buttonWrapper: {
    padding: "6px 0 18px",

    textAlign:
      "center" as const,
  },

  button: {
    display: "inline-block",

    padding: "10px 20px",

    color: "#ffffff",

    backgroundColor: "#087ff5",

    borderRadius: "5px",

    fontSize: "12px",

    fontWeight: "600",

    textDecoration: "none",
  },

  notice: {
    margin: "0 0 14px",

    padding: "10px 12px",

    color: "#1d4ed8",

    backgroundColor: "#eff6ff",

    border: "1px solid #dbeafe",

    borderRadius: "5px",

    fontSize: "11px",

    lineHeight: "1.45",

    textAlign:
      "center" as const,
  },

  secondaryText: {
    margin: "0 0 16px",

    color: "#6b7280",

    fontSize: "11px",

    lineHeight: "1.5",
  },

  divider: {
    margin: "16px 0",

    borderColor: "#e5e7eb",
  },

  fallbackText: {
    margin: "0 0 5px",

    color: "#9ca3af",

    fontSize: "10px",

    lineHeight: "1.4",
  },

  link: {
    color: "#087ff5",

    fontSize: "10px",

    lineHeight: "1.4",

    wordBreak:
      "break-all" as const,

    textDecoration: "none",
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

    textAlign:
      "center" as const,
  },
};