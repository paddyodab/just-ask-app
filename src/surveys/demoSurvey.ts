export const demoSurvey = {
  title: "Demo Survey - Not Connected to Backend",
  description: "This is a demo survey shown when the backend API is not available",
  showProgressBar: "top",
  pages: [
    {
      name: "connectionStatus",
      title: "Backend Connection Status",
      elements: [
        {
          type: "html",
          name: "connectionInfo",
          html: `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #856404; margin-top: 0;">⚠️ Backend Not Connected</h3>
              <p style="color: #856404; margin-bottom: 10px;">
                This is a demo survey that appears when the backend API is not available.
              </p>
              <p style="color: #856404; margin-bottom: 0;">
                To connect to your backend:
              </p>
              <ul style="color: #856404; margin-top: 10px;">
                <li>Ensure your backend server is running on the expected port</li>
                <li>Check that the API endpoints are configured correctly</li>
                <li>Verify that CORS is properly configured on your backend</li>
              </ul>
            </div>
          `
        },
        {
          type: "radiogroup",
          name: "demo_question_1",
          title: "How did you find this demo application?",
          isRequired: true,
          choices: [
            "GitHub",
            "Documentation",
            "Tutorial",
            "Colleague",
            "Other"
          ]
        }
      ]
    },
    {
      name: "feedbackPage",
      title: "Demo Feedback",
      elements: [
        {
          type: "rating",
          name: "demo_rating",
          title: "How would you rate this demo experience?",
          isRequired: true,
          rateMax: 5,
          minRateDescription: "Poor",
          maxRateDescription: "Excellent"
        },
        {
          type: "comment",
          name: "demo_feedback",
          title: "Any feedback about the demo?",
          rows: 4,
          placeholder: "This is a demo form - responses are not saved when backend is not connected"
        },
        {
          type: "html",
          name: "apiInfo",
          html: `
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin-top: 20px;">
              <h4 style="color: #0c5460; margin-top: 0;">ℹ️ API Configuration</h4>
              <p style="color: #0c5460; margin-bottom: 10px;">
                When connected, this app expects the following endpoints:
              </p>
              <code style="display: block; background: white; padding: 10px; border-radius: 4px; color: #0c5460; font-size: 12px;">
                GET  /api/v1/operations/customers<br>
                GET  /api/v1/operations/customers/{hex}/namespaces<br>
                GET  /api/v1/operations/customers/{hex}/namespaces/{ns}/surveys<br>
                GET  /{hex}/{namespace}/survey?survey_name={name}<br>
                POST /{hex}/{namespace}/responses?survey_name={name}
              </code>
            </div>
          `
        }
      ]
    }
  ],
  completedHtml: `
    <div style="text-align: center; padding: 20px;">
      <h3>Demo Survey Complete!</h3>
      <p style="color: #666; margin: 20px 0;">
        This was a demo submission. No data was saved because the backend is not connected.
      </p>
      <div style="background: #e3f2fd; border: 1px solid #90caf9; border-radius: 8px; padding: 15px; margin: 20px auto; max-width: 500px;">
        <p style="color: #1565c0; margin: 0;">
          To save real survey responses, connect your backend API and configure the appropriate endpoints.
        </p>
      </div>
    </div>
  `,
  showQuestionNumbers: "off",
  questionErrorLocation: "bottom",
  completeText: "Complete Demo",
  previewText: "Review Demo",
  editText: "Edit",
  startSurveyText: "Start Demo"
}