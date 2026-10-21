package com.qlc.api.services;

import com.qlc.shared.model.entities.User;
import com.qlc.api.repositories.UserRepository;
import com.qlc.api.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserService implements UserDetailsService {

  public UserRepository userRepository;

  @Autowired
  public void setUserRepository(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
    User user = userRepository.findByUsername(login)
        .or(() -> userRepository.findByEmailIgnoreCase(login))
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));

    return UserDetailsImpl.build(user);
  }
}
