import React, { useState, useEffect } from "react";

interface ExampleReactComponentProps {
  content: string;
}

export const ExampleReactComponent: React.FC<ExampleReactComponentProps> = ({
  content,
}) => {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [parsedContent, setParsedContent] = useState<any>(null);

  useEffect(() => {
    // Try to parse the content as JSON for interactive display
    try {
      const parsed = JSON.parse(content);
      setParsedContent(parsed);
    } catch {
      // If not JSON, treat as plain text
      setParsedContent(null);
    }
  }, [content]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const styles = {
    container: {
      padding: "20px",
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
      color: theme === "light" ? "#333333" : "#ffffff",
      minHeight: "200px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      transition: "all 0.3s ease",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "10px",
      borderBottom: `2px solid ${theme === "light" ? "#e0e0e0" : "#404040"}`,
    },
    title: {
      margin: 0,
      fontSize: "24px",
      fontWeight: "bold",
    },
    button: {
      padding: "8px 16px",
      margin: "0 8px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.2s ease",
    },
    primaryButton: {
      backgroundColor: "#007bff",
      color: "white",
    },
    secondaryButton: {
      backgroundColor: theme === "light" ? "#f8f9fa" : "#404040",
      color: theme === "light" ? "#333333" : "#ffffff",
      border: `1px solid ${theme === "light" ? "#dee2e6" : "#606060"}`,
    },
    content: {
      marginTop: "20px",
    },
    jsonDisplay: {
      backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
      padding: "15px",
      borderRadius: "8px",
      border: `1px solid ${theme === "light" ? "#dee2e6" : "#404040"}`,
      fontFamily: "monospace",
      fontSize: "14px",
      whiteSpace: "pre-wrap",
      overflow: "auto",
      maxHeight: "300px",
    },
    counter: {
      fontSize: "18px",
      fontWeight: "bold",
      color: theme === "light" ? "#007bff" : "#4dabf7",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>React Component Example</h1>
        <div>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={toggleTheme}
          >
            {theme === "light" ? "🌙" : "☀️"}{" "}
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => setCount(count + 1)}
          >
            Count: <span style={styles.counter}>{count}</span>
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <h3>Interactive Features:</h3>
        <ul>
          <li>✅ Theme switching (light/dark mode)</li>
          <li>✅ Interactive counter</li>
          <li>✅ Dynamic content rendering</li>
          <li>✅ Responsive design</li>
          <li>✅ Smooth transitions</li>
        </ul>

        <h3>Content from Parent:</h3>
        {parsedContent ? (
          <div>
            <p>Parsed JSON content:</p>
            <div style={styles.jsonDisplay}>
              {JSON.stringify(parsedContent, null, 2)}
            </div>
          </div>
        ) : (
          <div style={styles.jsonDisplay}>
            {content || "No content provided"}
          </div>
        )}

        <h3>Component State:</h3>
        <p>
          Current theme: <strong>{theme}</strong>
        </p>
        <p>
          Click count: <strong>{count}</strong>
        </p>
      </div>
    </div>
  );
};
