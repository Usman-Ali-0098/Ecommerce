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
        Reset your password. This link expires in one minute.
      </Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>AUTHENTICATION APP</Text>
          </Section>

          <Section style={styles.content}>
            <Heading style={styles.heading}>
              Reset Your Password
            </Heading>

            <Text style={styles.text}>
              Hello {fullName},
            </Text>

            <Text style={styles.text}>
              We received a request to reset your account password.
              Click the button below to create a new password.
            </Text>

            <Section style={styles.buttonWrapper}>
              <Button
                href={resetUrl}
                style={styles.button}
              >
                Reset Password
              </Button>
            </Section>

            <Section style={styles.notice}>
              <Text style={styles.noticeText}>
                This secure link expires in 1 minute and can only
                be used once.
              </Text>
            </Section>

            <Text style={styles.secondaryText}>
              If you did not request this password reset, you can
              safely ignore this email. Your current password will
              remain unchanged.
            </Text>

            <Hr style={styles.divider} />

            <Text style={styles.fallbackText}>
              If the button does not work, copy and paste this link
              into your browser:
            </Text>

            <Link
              href={resetUrl}
              style={styles.link}
            >
              {resetUrl}
            </Link>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              This is an automated security email. Never share this
              reset link with anyone.
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
    padding: "40px 12px",
    backgroundColor: "#f8f9fa",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
  },

  header: {
    padding: "24px 32px",
    backgroundColor: "#087ff5",
    textAlign: "center" as const,
  },

  brand: {
    margin: "0",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    letterSpacing: "1.8px",
  },

  content: {
    padding: "40px 42px 34px",
  },

  heading: {
    margin: "0 0 28px",
    color: "#087ff5",
    fontSize: "30px",
    fontWeight: "500",
    lineHeight: "1.3",
    textAlign: "center" as const,
  },

  text: {
    margin: "0 0 18px",
    color: "#212529",
    fontSize: "16px",
    lineHeight: "1.7",
  },

  buttonWrapper: {
    padding: "12px 0 28px",
    textAlign: "center" as const,
  },

  button: {
    display: "inline-block",
    padding: "14px 30px",
    color: "#ffffff",
    backgroundColor: "#087ff5",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "500",
    textDecoration: "none",
  },

  notice: {
    marginBottom: "24px",
    padding: "14px 18px",
    backgroundColor: "#cfe2ff",
    border: "1px solid #b6d4fe",
    borderRadius: "5px",
  },

  noticeText: {
    margin: "0",
    color: "#084298",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.5",
    textAlign: "center" as const,
  },

  secondaryText: {
    margin: "0 0 24px",
    color: "#6c757d",
    fontSize: "14px",
    lineHeight: "1.65",
  },

  divider: {
    margin: "24px 0",
    borderColor: "#dee2e6",
  },

  fallbackText: {
    margin: "0 0 8px",
    color: "#6c757d",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  link: {
    color: "#087ff5",
    fontSize: "13px",
    lineHeight: "1.5",
    wordBreak: "break-all" as const,
  },

  footer: {
    padding: "20px 32px",
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #dee2e6",
  },

  footerText: {
    margin: "0",
    color: "#6c757d",
    fontSize: "12px",
    lineHeight: "1.5",
    textAlign: "center" as const,
  },
};