export const restaurantSurvey = {
  title: "Restaurant Preferences Survey",
  description: "Tell us about your favorite restaurants and dining preferences",
  showProgressBar: "top",
  pages: [
    {
      name: "cuisinePage",
      title: "Cuisine Preferences",
      elements: [
        {
          type: "dropdown",
          name: "favorite_cuisine",
          title: "What's your favorite cuisine?",
          isRequired: true,
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/cuisine-types",
            valueName: "key",
            titleName: "text"
          },
          placeholder: "Select a cuisine type..."
        }
      ]
    },
    {
      name: "restaurantPage",
      title: "Restaurant Selection",
      elements: [
        {
          type: "checkbox",
          name: "visited_restaurants",
          title: "Which {favorite_cuisine} restaurants do you visit?",
          visibleIf: "{favorite_cuisine} notempty",
          isRequired: true,
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/restaurants?cuisine={favorite_cuisine}",
            valueName: "key",
            titleName: "text"
          },
          validators: [
            {
              type: "expression",
              text: "Please select at least one restaurant",
              expression: "{visited_restaurants.length} > 0"
            }
          ]
        },
        {
          type: "dropdown",
          name: "favorite_restaurant",
          title: "Which is your favorite {favorite_cuisine} restaurant?",
          visibleIf: "{visited_restaurants} notempty",
          isRequired: true,
          choicesVisibleIf: "{visited_restaurants} contains {item}",
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/restaurants?cuisine={favorite_cuisine}",
            valueName: "key",
            titleName: "text"
          },
          placeholder: "Select your favorite..."
        }
      ]
    },
    {
      name: "dishesPage",
      title: "Favorite Dishes",
      elements: [
        {
          type: "checkbox",
          name: "favorite_dishes",
          title: "What are your favorite dishes at {favorite_restaurant}?",
          visibleIf: "{favorite_restaurant} notempty",
          isRequired: true,
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/dishes?restaurant={favorite_restaurant}",
            valueName: "key",
            titleName: "text"
          },
          validators: [
            {
              type: "expression",
              text: "Please select at least one dish",
              expression: "{favorite_dishes.length} > 0"
            }
          ],
          renderAs: "tagbox",
          description: "You can select multiple dishes"
        }
      ]
    },
    {
      name: "preferencesPage",
      title: "Dining Preferences",
      elements: [
        {
          type: "dropdown",
          name: "price_range",
          title: "What's your typical price range when dining out?",
          isRequired: true,
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/price-ranges",
            valueName: "key",
            titleName: "text"
          },
          placeholder: "Select price range..."
        },
        {
          type: "checkbox",
          name: "dietary_restrictions",
          title: "Do you have any dietary restrictions?",
          description: "Select all that apply",
          choicesByUrl: {
            url: "/30f8f53cf8034393b00665f664a60ddb/restaurant-survey/lookups/dietary-restrictions",
            valueName: "key",
            titleName: "text"
          },
          showNoneItem: true,
          noneText: "No Restrictions"
        },
        {
          type: "radiogroup",
          name: "dining_frequency",
          title: "How often do you eat out?",
          isRequired: true,
          choices: [
            { value: "daily", text: "Daily" },
            { value: "weekly", text: "2-3 times a week" },
            { value: "biweekly", text: "Once a week" },
            { value: "monthly", text: "2-3 times a month" },
            { value: "rarely", text: "Once a month or less" }
          ]
        }
      ]
    },
    {
      name: "feedbackPage",
      title: "Additional Feedback",
      elements: [
        {
          type: "rating",
          name: "overall_satisfaction",
          title: "Overall, how satisfied are you with the restaurant options in your area?",
          isRequired: true,
          rateMax: 5,
          minRateDescription: "Very Unsatisfied",
          maxRateDescription: "Very Satisfied"
        },
        {
          type: "comment",
          name: "suggestions",
          title: "Any other restaurants or cuisines you'd like to see in your area?",
          rows: 4,
          placeholder: "Tell us your suggestions..."
        },
        {
          type: "boolean",
          name: "newsletter",
          title: "Would you like to receive updates about new restaurants in your area?",
          defaultValue: false
        }
      ]
    }
  ],
  completedHtml: "<h3>Thank you for completing the restaurant survey!</h3><p>Your preferences have been recorded and will help us provide better dining recommendations.</p>",
  showQuestionNumbers: "off",
  questionErrorLocation: "bottom",
  completeText: "Submit Survey",
  previewText: "Review Answers",
  editText: "Edit Answer",
  startSurveyText: "Start Survey",
  
  // Dynamic text substitution
  onTextMarkdown: {
    // This will replace {favorite_cuisine} with the actual selected value text
    processText: function(text: string, name: string) {
      const model = this
      if (text.includes("{favorite_cuisine}")) {
        const cuisineKey = model.getValue("favorite_cuisine")
        if (cuisineKey) {
          // Try to get the display text from the dropdown
          const question = model.getQuestionByName("favorite_cuisine")
          if (question && question.choices) {
            const choice = question.choices.find((c: any) => c.value === cuisineKey)
            if (choice) {
              text = text.replace("{favorite_cuisine}", choice.text)
            }
          }
        }
      }
      if (text.includes("{favorite_restaurant}")) {
        const restaurantKey = model.getValue("favorite_restaurant")
        if (restaurantKey) {
          const question = model.getQuestionByName("favorite_restaurant")
          if (question && question.choices) {
            const choice = question.choices.find((c: any) => c.value === restaurantKey)
            if (choice) {
              text = text.replace("{favorite_restaurant}", choice.text)
            }
          }
        }
      }
      return text
    }
  }
}