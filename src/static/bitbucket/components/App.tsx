import * as React from 'react';
import { proxyRequest } from '../utils/RequestProxy';

type BannerMessage = {
  messageExists: boolean;
  message: string | null;
  messageType: 'default' | 'warning' | 'error' | null;
};

type AppState = {
  curState: 'checking-can-land' | 'cannot-land' | 'queued' | 'can-land' | 'pr-closed' | 'unknown-error';
  canLand: boolean;
  canLandWhenAble: boolean;
  errors: string[];
  bannerMessage: BannerMessage;
};

export class App extends React.Component {
  messageColours = {
    default: 'transparent',
    warning: 'orange',
    error: 'red',
  };

  messageEmoji = {
    default: '📢',
    warning: '⚠️',
    error: '❌',
  };

  state: AppState = {
    curState: 'checking-can-land',
    canLand: false,
    canLandWhenAble: false,
    errors: [],
    bannerMessage: {
      messageExists: false,
      message: null,
      messageType: null,
    },
  };

  async componentDidMount() {
    const qs = new URLSearchParams(window.location.search);
    const isOpen = qs.get('state') === 'OPEN';
    if (!isOpen) {
      return this.setState({ curState: 'pr-closed' });
    }
    this.checkifAble();
  }

  checkifAble = () => {
    type Resp = {
      canLand: string;
      canLandWhenAble: string;
      errors: string[];
      bannerMessage: BannerMessage;
    };
    proxyRequest<Resp>('/can-land', 'POST')
      .then(({ canLand, canLandWhenAble, errors, bannerMessage }) => {
        if (canLand) {
          return this.setState({
            curState: 'can-land',
            bannerMessage,
          });
        }
        this.setState({
          curState: 'cannot-land',
          canLandWhenAble,
          errors,
          bannerMessage,
        });
      })
      .catch(err => {
        console.error(err);
        this.setState({ curState: 'unknown-error' });
      });
  };

  onLandClicked = () => {
    proxyRequest('/land', 'POST')
      .then(() => {
        this.setState({
          curState: 'queued',
        });
      })
      .catch(err => {
        console.error(err);
        this.setState({ curState: 'unknown-error' });
      });
  };

  onLandWhenAbleClicked = () => {
    proxyRequest('/land-when-able', 'POST')
      .then(() => {
        this.setState({
          curState: 'queued',
        });
      })
      .catch(err => {
        console.error(err);
        this.setState({ curState: 'unknown-error' });
      });
  };

  onCheckAgainClicked = () => {
    this.setState(
      {
        curState: 'checking-can-land',
      },
      this.checkifAble,
    );
  };

  renderLandState = (curState: AppState['curState']) => {
    switch (curState) {
      case 'checking-can-land': {
        return <p>🤔 Checking Landkid permissions...</p>;
      }
      case 'can-land': {
        return (
          <div>
            <p>Your PR is ready to land!</p>
            <div style={{ marginTop: '15px' }}>
              <button type="button" className="ak-button ak-button__appearance-primary" onClick={this.onLandClicked}>
                Land
              </button>
            </div>
          </div>
        );
      }
      case 'cannot-land': {
        const { canLandWhenAble, errors } = this.state;

        return (
          <div>
            <p> 😭 You cannot currently land this PR for the following reasons: </p>
            <ul>
              {errors.map(error => {
                return <li key={error}>{error}</li>;
              })}
            </ul>
            <div style={{ display: 'flex', marginTop: '15px' }}>
              <button
                type="button"
                className="ak-button ak-button__appearance-default"
                onClick={this.onCheckAgainClicked}
              >
                Check again
              </button>
              {canLandWhenAble && (
                <button
                  type="button"
                  className="ak-button ak-button__appearance-default"
                  style={{ marginLeft: '15px' }}
                  onClick={this.onLandWhenAbleClicked}
                >
                  Land when able
                </button>
              )}
            </div>
            <p>
              Click{' '}
              <a href="/" target="_blank">
                here
              </a>{' '}
              to see more information about Landkid
            </p>
          </div>
        );
      }
      case 'queued': {
        return (
          <div>
            👌 Your PR is queued to land! <br /> Click{' '}
            <a href="/" target="_blank">
              here
            </a>{' '}
            to see more information about Landkid
          </div>
        );
      }
      case 'unknown-error': {
        return <div>💩 An unknown error occured, see console for information</div>;
      }
      case 'pr-closed': {
        return <div>👏 Pullrequest is already closed!</div>;
      }
    }
  };

  render() {
    const {
      curState,
      bannerMessage: { messageExists, message, messageType },
    } = this.state;
    const msgType = messageType || 'default';
    return (
      <React.Fragment>
        {curState !== 'checking-can-land' && messageExists ? (
          <div
            style={{
              width: 'fit-content',
              border: `2px solid ${this.messageColours[msgType]}`,
              borderRadius: '5px',
              padding: '6px',
              marginBottom: '10px',
              fontWeight: msgType === 'default' ? 'bold' : 'normal',
            }}
          >
            {`${this.messageEmoji[msgType]} ${message} ${this.messageEmoji[msgType]}`}
          </div>
        ) : null}
        {this.renderLandState(curState)}
      </React.Fragment>
    );
  }
}
