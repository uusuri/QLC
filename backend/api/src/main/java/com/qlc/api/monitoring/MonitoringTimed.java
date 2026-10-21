package com.qlc.api.monitoring;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ ElementType.ANNOTATION_TYPE, ElementType.TYPE, ElementType.METHOD })
@Retention(RetentionPolicy.RUNTIME)
public @interface MonitoringTimed {

  String value() default "";

  String[] extraTags() default {};

  boolean longTask() default false;

  double[] percentiles() default {};

  boolean histogram() default false;

  String description() default "";

  boolean loggingEnabled() default false;
}
