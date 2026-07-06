package com.qlc.security;

import com.qlc.models.entities.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

public class UserDetailsImpl implements UserDetails {

  private final Long id;
  private final Long tgId;
  private final String username;
  private final String email;
  private final String password;
  private final String role;
  private final Collection<? extends GrantedAuthority> authorities;

  public UserDetailsImpl(Long id, Long tgId, String username, String email, String password, String role,
                         Collection<? extends GrantedAuthority> authorities) {
    this.id = id;
    this.tgId = tgId;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
    this.authorities = authorities;
  }

  public static UserDetailsImpl build(User user) {
    String roleName = user.getRole() != null ? user.getRole().name() : "ROLE_USER";
    List<GrantedAuthority> auth = List.of(new SimpleGrantedAuthority(roleName));
    return new UserDetailsImpl(user.getId(), user.getTgId(), user.getUsername(), user.getEmail(), user.getPassword(),
        roleName, auth);
  }

  public Long getId() { return id; }
  public Long getTgId() { return tgId; }
  public String getEmail() { return email; }
  public String getRole() { return role; }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

  @Override
  public String getPassword() { return password; }

  @Override
  public String getUsername() { return username; }

  @Override
  public boolean isAccountNonExpired() { return true; }

  @Override
  public boolean isAccountNonLocked() { return true; }

  @Override
  public boolean isCredentialsNonExpired() { return true; }

  @Override
  public boolean isEnabled() { return true; }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof UserDetailsImpl)) return false;
    UserDetailsImpl that = (UserDetailsImpl) o;
    return Objects.equals(id, that.id);
  }

  @Override
  public int hashCode() { return Objects.hashCode(id); }
}
