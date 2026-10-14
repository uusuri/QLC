package com.qlc.models.requests;

import jakarta.validation.constraints.Size;
import java.util.List;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

public record AnswerRequest(
    @Size(max = 1000) @JsonDeserialize(contentUsing = OptionIndexDeserializer.class) List<Integer> selectedOptionIndexes,
    @Size(max = 256) @JsonDeserialize(using = DecimalStringDeserializer.class) String numericAnswer) {

  public static class OptionIndexDeserializer extends ValueDeserializer<Integer> {
    @Override
    public Integer deserialize(JsonParser parser, DeserializationContext context) {
      if (!parser.hasToken(JsonToken.VALUE_NUMBER_INT)) {
        return context.reportInputMismatch(Integer.class, "Option indexes must be integers");
      }
      return parser.getIntValue();
    }
  }

  // Reject JSON numbers before Jackson can coerce them to strings and hide lost precision.
  public static class DecimalStringDeserializer extends ValueDeserializer<String> {
    @Override
    public String deserialize(JsonParser parser, DeserializationContext context) {
      if (!parser.hasToken(JsonToken.VALUE_STRING)) {
        return context.reportInputMismatch(String.class, "numericAnswer must be a string");
      }
      return parser.getString();
    }
  }
}
