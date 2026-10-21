package com.qlc.api.configs;

import org.springframework.context.annotation.Configuration;
import com.qlc.api.monitoring.MonitoringTimedAspect;
import org.springframework.context.annotation.Bean;

@Configuration
public class MonitoringConfig {
  @Bean
  public MonitoringTimedAspect timedAspect() {
    return new MonitoringTimedAspect();
  }
}
