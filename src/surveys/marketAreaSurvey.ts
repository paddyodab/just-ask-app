export const marketAreaSurvey = {
  title: "Market Area Survey",
  description: "Please select your market area and provide additional information",
  showProgressBar: "top",
  pages: [{
    name: "locationPage",
    title: "Location Information",
    elements: [{
      type: "dropdown",
      name: "market_area",
      title: "Select your market area",
      isRequired: true,
      choicesByUrl: {
        url: "/api/v1/lookups/market-areas",
        valueName: "value",
        titleName: "text"
      },
      placeholder: "Choose a market area..."
    }, {
      type: "dropdown",
      name: "hospital",
      title: "Select your hospital",
      isRequired: true,
      visibleIf: "{market_area} notempty",
      choicesByUrl: {
        url: "/api/v1/lookups/hospitals?parent_key={market_area}",
        valueName: "value",
        titleName: "text"
      },
      placeholder: "Choose a hospital..."
    }, {
      type: "dropdown",
      name: "hospital_system",
      title: "Select hospital system",
      visibleIf: "{hospital} notempty",
      choicesByUrl: {
        url: "/api/v1/lookups/hospital-systems?parent_key={hospital}",
        valueName: "value",
        titleName: "text"
      },
      placeholder: "Choose a hospital system..."
    }, {
      type: "dropdown",
      name: "zip_code",
      title: "Enter your ZIP code",
      visibleIf: "{market_area} notempty",
      searchEnabled: true,
      choicesByUrl: {
        url: "/api/v1/lookups/zip-codes?parent_key={market_area}",
        valueName: "value",
        titleName: "text"
      },
      placeholder: "Search for ZIP code..."
    }]
  }, {
    name: "detailsPage",
    title: "Additional Details",
    visibleIf: "{zip_code} notempty",
    elements: [{
      type: "text",
      name: "contact_name",
      title: "Contact Name",
      isRequired: true
    }, {
      type: "text",
      name: "email",
      title: "Email Address",
      isRequired: true,
      inputType: "email",
      validators: [{
        type: "email",
        text: "Please enter a valid email address"
      }]
    }, {
      type: "text",
      name: "phone",
      title: "Phone Number",
      inputType: "tel"
    }, {
      type: "comment",
      name: "notes",
      title: "Additional Notes",
      rows: 4
    }]
  }],
  completedHtml: "<h3>Thank you for completing the survey!</h3><p>Your response has been recorded.</p>",
  showQuestionNumbers: "off",
  questionErrorLocation: "bottom"
}