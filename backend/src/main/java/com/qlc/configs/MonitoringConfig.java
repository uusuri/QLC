package com.qlc.configs;

import org.springframework.context.annotation.Configuration;
import com.qlc.monitoring.MonitoringTimedAspect;
import org.springframework.context.annotation.Bean;

@Configuration
public class MonitoringConfig {
  @Bean
  public MonitoringTimedAspect timedAspect() {
    return new MonitoringTimedAspect();
  }
}
