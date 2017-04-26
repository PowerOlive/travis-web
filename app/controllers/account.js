/* global Travis */
import Ember from 'ember';
import computed, { alias } from 'ember-computed-decorators';
import Repository from 'travis/models/repo';

const { service } = Ember.inject;

export default Ember.Controller.extend({
  auth: service(),
  allHooks: [],

  @alias('auth.currentUser') user: null,

  init() {
    this._super(...arguments);

    return Travis.on('user:synced', (() => {
      return this.reloadOwnerRepositories();
    }));
  },

  actions: {
    sync() {
      return this.get('user').sync();
    },

    toggle(hook) {
      return hook.toggle();
    }
  },

  reloadOwnerRepositories() {
    const login = this.get('model.login');
    if (login) {
      this.set('loadingError', false);
      const repositories = Repository.fetchByOwner(this.store, login);
      return repositories.then(() => {
        const ownedRepositories = this.store.peekAll('repo', repo => repo.owner.login === login);
        this.set('allHooks', ownedRepositories);
        this.set('allHooks.isLoaded', true);
      }).catch(() => {
        this.set('loadingError', true);
      });
    }
  },

  @computed('model.{name,login}')
  accountName(name, login) {
    return name || login;
  },

  @computed('allHooks.[]')
  hooks(hooks) {
    if (!hooks) {
      this.reloadOwnerRepositories();
    }
    return hooks.filter(function (hook) {
      return hook.get('permissions.admin');
    }).sortBy('name');
  },

  @computed('allHooks.[]')
  hooksWithoutAdmin(hooks) {
    if (!hooks) {
      this.reloadOwnerRepositories();
    }
    return this.get('allHooks').filter(function (hook) {
      return !hook.get('permissions.admin');
    }).sortBy('name');
  },

  showPrivateReposHint: Ember.computed(function () {
    return this.config.show_repos_hint === 'private';
  }),

  showPublicReposHint: Ember.computed(function () {
    return this.config.show_repos_hint === 'public';
  }),

  @computed('model.{type,login}')
  billingUrl(type, login) {
    const id = type === 'user' ? 'user' : login;
    return this.config.billingEndpoint + '/subscriptions/' + id;
  },

  @computed('model.{subscribed,education}', 'billingUrl')
  subscribeButtonInfo(subscribed, education, billingUrl) {
    return {
      billingUrl,
      subscribed,
      education,
    };
  }
});
